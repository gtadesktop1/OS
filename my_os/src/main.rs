#![no_std]
#![no_main]

use core::ffi::c_void;
use core::ptr::NonNull;
use uefi::prelude::*;
use uefi::proto::graphics::GraphicsOutput;
use uefi::proto::media::file::{File, FileInfo, FileAttribute, FileMode, FileType};
use uefi::proto::media::fs::SimpleFileSystem;
use uefi::proto::loaded_image::LoadedImage;
use uefi::table::{Boot, SystemTable, boot::OpenProtocolParams, boot::OpenProtocolAttributes, runtime::ResetType};
use uefi::data_types::{CStr16, CString16, Char16};
use uefi_services::{system_table, init as uefi_init};

// Syscall-Strukturen
#[repr(C)]
pub struct SyscallTable {
    pub fb_ptr: *mut c_void,
    pub stride: usize,
    pub width: u32,
    pub height: u32,
    pub get_key: extern "C" fn() -> u16,
    pub get_time: extern "C" fn(*mut u16, *mut u16, *mut u16),
    pub list_files: extern "C" fn(*const Char16, *mut FileEntry, usize, usize) -> usize,
    pub execute_app: extern "C" fn(*const u8),
    pub reboot: extern "C" fn(),
    pub shutdown: extern "C" fn(),
}

#[repr(C)]
pub struct FileEntry {
    pub is_dir: u8,
    pub name: [u8; 24],
}

// UEFI-Einstiegspunkt
#[entry]
fn main(image_handle: Handle, mut system_table: SystemTable<Boot>) -> Status {
    uefi_init(&mut system_table);

    // Framebuffer initialisieren
    let fb_info = match initialize_framebuffer(&system_table) {
        Ok(info) => info,
        Err(e) => return e,
    };

    // Syscall-Tabelle erstellen und speichern
    let syscall_table = Box::leak(Box::new(SyscallTable {
        fb_ptr: fb_info.ptr,
        stride: fb_info.stride,
        width: fb_info.width,
        height: fb_info.height,
        get_key,
        get_time,
        list_files,
        execute_app,
        reboot,
        shutdown,
    }));

    // App-Manager laden
    let manager_path = match CString16::from_str_trunc("APPS\\MANAGER.BIN") {
        Some(path) => path,
        None => return Status::INVALID_PARAMETER,
    };

    unsafe {
        (syscall_table.execute_app)(manager_path.as_ptr());
    }

    Status::SUCCESS
}

// Framebuffer-Initialisierung
fn initialize_framebuffer(st: &SystemTable<Boot>) -> Result<FramebufferInfo, Status> {
    let bs = st.boot_services();
    let gop_handle = bs.get_handle_for_protocol::<GraphicsOutput>()
        .ok_or(Status::NOT_FOUND)?;

    let gop = bs.open_protocol(
        OpenProtocolParams {
            handle: gop_handle,
            agent: st.image_handle(),
            controller: None,
        },
        OpenProtocolAttributes::GetProtocol,
    )?;

    let mode = gop.current_mode_info();
    let (width, height) = mode.resolution();
    let stride = mode.pixels_per_scanline() * 4;

    Ok(FramebufferInfo {
        ptr: mode.frame_buffer().as_mut_ptr() as *mut c_void,
        stride,
        width,
        height,
    })
}

struct FramebufferInfo {
    ptr: *mut c_void,
    stride: usize,
    width: u32,
    height: u32,
}

// Syscall: list_files (echte Filesystem-Logik)
#[no_mangle]
pub extern "C" fn list_files(
    path: *const Char16,
    buffer: *mut FileEntry,
    buffer_size: usize,
    offset: usize,
) -> usize {
    let st = unsafe { get_system_table() };
    let bs = st.boot_services();
    let path = unsafe { CStr16::from_ptr(path) };
    let mut count = 0;

    // Verzeichnis öffnen
    let fs = match bs.get_handle_for_protocol::<SimpleFileSystem>()
        .and_then(|handle| bs.open_protocol(
            OpenProtocolParams {
                handle,
                agent: st.image_handle(),
                controller: None,
            },
            OpenProtocolAttributes::GetProtocol,
        ).ok()) {
        Some(fs) => fs,
        None => return 0,
    };

    let dir = match fs.open_volume_directory() {
        Ok(dir) => dir,
        Err(_) => return 0,
    };

    // Einträge lesen (mit Pagination)
    let entries = dir.entries().skip(offset).take(buffer_size);
    for (i, entry) in entries.enumerate() {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => break,
        };

        let info = match entry.get_info::<FileInfo>() {
            Ok(info) => info,
            Err(_) => continue,
        };

        if i >= buffer_size { break; }

        // Eintrag in Buffer schreiben
        let entry_out = unsafe { &mut *buffer.add(i) };
        entry_out.is_dir = (info.file_type() == FileType::DIR) as u8;
        
        let name_bytes = entry.file_name().to_bytes();
        let name_len = core::cmp::min(name_bytes.len(), 23);
        for j in 0..name_len {
            entry_out.name[j] = name_bytes[j];
        }
        entry_out.name[name_len] = 0; // Nullterminierung

        count += 1;
    }

    count
}

// Syscall: execute_app (UEFI-App-Lade-Logik)
#[no_mangle]
pub extern "C" fn execute_app(path: *const u8) {
    let st = unsafe { get_system_table() };
    let bs = st.boot_services();
    let path = unsafe { CStr16::from_ptr(path as *const Char16) };

    // Datei öffnen
    let fs = match bs.get_handle_for_protocol::<SimpleFileSystem>()
        .and_then(|handle| bs.open_protocol(
            OpenProtocolParams {
                handle,
                agent: st.image_handle(),
                controller: None,
            },
            OpenProtocolAttributes::GetProtocol,
        )) {
        Some(Ok(fs)) => fs,
        _ => return,
    };

    let file = match fs.open_file(path, FileMode::Read, FileAttribute::empty()) {
        Ok(file) => file,
        Err(_) => return,
    };

    // Datei laden
    let size = match file.size() {
        Ok(size) => size,
        Err(_) => return,
    };

    let mut buffer = Vec::with_capacity(size as usize);
    unsafe { buffer.set_len(size as usize) };
    
    if let Err(_) = file.read(&mut buffer) {
        return;
    }

    // UEFI-Anwendung laden und starten
    let app_handle = match bs.load_image(
        false,
        st.image_handle(),
        LoadedImage::get_loaded_image_protocol,
        path,
    ) {
        Ok(handle) => handle,
        Err(_) => return,
    };

    let _ = bs.start_image(app_handle);
}

// Syscall: get_key (Placeholder)
#[no_mangle]
pub extern "C" fn get_key() -> u16 { 0 }

// Syscall: get_time (Placeholder)
#[no_mangle]
pub extern "C" fn get_time(_h: *mut u16, _m: *mut u16, _s: *mut u16) {}

// Syscall: reboot
#[no_mangle]
pub extern "C" fn reboot() {
    get_system_table().boot_services().reset(ResetType::COLD, Status::SUCCESS, None);
}

// Syscall: shutdown
#[no_mangle]
pub extern "C" fn shutdown() {
    get_system_table().boot_services().reset(ResetType::SHUTDOWN, Status::SUCCESS, None);
}

// SystemTable-Zugriff
fn get_system_table() -> &'static SystemTable<Boot> {
    unsafe { &*(system_table() as *const _) }
}