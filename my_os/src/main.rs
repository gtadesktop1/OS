#![no_std]
#![no_main]

extern crate alloc;

use uefi::prelude::*;
use uefi::proto::console::text::{Input, Key}; 
use uefi::proto::console::gop::GraphicsOutput;
use uefi::proto::media::file::{File, FileAttribute, FileMode, Directory, FileInfo};
use uefi::proto::media::fs::SimpleFileSystem;
use uefi::table::runtime::{ResetType, RuntimeServices};
use uefi::table::boot::{AllocateType, MemoryType};
use uefi::{CStr16, Status};
use core::arch::asm;

// --- GLOBALE STATIKEN ---
static mut FB_PTR: *mut u32 = core::ptr::null_mut();
static mut STRIDE: i32 = 0;
static mut INTERNAL_INPUT: *mut Input = core::ptr::null_mut();
static mut RT_PTR: *const RuntimeServices = core::ptr::null();
static mut BOOT_SERVICES_PTR: *const BootServices = core::ptr::null();
static mut CURRENT_USER_LEVEL: u32 = 0; 

// --- STRUKTUREN FÜR C-KOMPATIBILITÄT ---

#[repr(C, packed)]
pub struct FileEntry {
    pub name: [u8; 32],
    pub is_dir: u8,    // u8 für exakte C-Größe (1 Byte)
    pub size: u32,
}

#[repr(C)]
pub struct SyscallTable {
    pub fb_ptr: *mut u32,
    pub stride: u32, 
    pub get_time: unsafe extern "win64" fn(*mut u16, *mut u16, *mut u16),
    pub get_key: unsafe extern "win64" fn() -> u16,
    pub reboot: unsafe extern "win64" fn(),
    pub shutdown: unsafe extern "win64" fn(),
    pub execute_app: unsafe extern "win64" fn(*const u8),
    pub file_write: unsafe extern "win64" fn(*const u8, *const u8, usize) -> i32,
    pub list_files: unsafe extern "win64" fn(*const u8, *mut FileEntry, u32) -> u32,
    pub check_permission: unsafe extern "win64" fn(u32) -> bool,
    pub file_read: unsafe extern "win64" fn(*const u8, *mut u8, usize) -> i32,
}

// --- SYSCALL IMPLEMENTIERUNGEN ---

#[unsafe(no_mangle)]
pub extern "win64" fn sys_get_key() -> u16 {
    unsafe {
        if INTERNAL_INPUT.is_null() { return 0; }
        let input = &mut *INTERNAL_INPUT;
        match input.read_key() {
            Ok(Some(key)) => match key {
                Key::Printable(c) => u16::from(c),
                Key::Special(s) => 0xFF00 | (s.0 as u16),
            },
            _ => 0,
        }
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "win64" fn sys_get_time(h: *mut u16, m: *mut u16, s: *mut u16) {
    unsafe {
        if RT_PTR.is_null() { return; }
        let rt = &*RT_PTR;
        if let Ok(time) = rt.get_time() {
            if !h.is_null() { *h = time.hour() as u16; }
            if !m.is_null() { *m = time.minute() as u16; }
            if !s.is_null() { *s = time.second() as u16; }
        }
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "win64" fn sys_reboot() {
    unsafe {
        if !RT_PTR.is_null() { 
            let _ = (*RT_PTR).reset(ResetType::COLD, Status::SUCCESS, None); 
        }
        asm!("out 0x64, al", in("al") 0xFEu8, options(noreturn, nomem, nostack));
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "win64" fn sys_shutdown() {
    unsafe {
        if !RT_PTR.is_null() { 
            let _ = (*RT_PTR).reset(ResetType::SHUTDOWN, Status::SUCCESS, None); 
        }
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "win64" fn sys_check_permission(level_needed: u32) -> bool {
    unsafe { CURRENT_USER_LEVEL <= level_needed }
}

#[unsafe(no_mangle)]
pub unsafe extern "win64" fn sys_list_files(path_ptr: *const u8, out_ptr: *mut FileEntry, max_count: u32) -> u32 {
    unsafe {
        if BOOT_SERVICES_PTR.is_null() { return 0; }
        let bs = &*BOOT_SERVICES_PTR;

        let path_str = core::ffi::CStr::from_ptr(path_ptr as *const i8).to_str().unwrap_or("");
        let mut buf = [0u16; 128];
        let uefi_path = CStr16::from_str_with_buf(path_str, &mut buf).unwrap();
        let mut count = 0;

        if let Ok(fs_h) = bs.get_handle_for_protocol::<SimpleFileSystem>() {
            if let Ok(mut fs) = bs.open_protocol_exclusive::<SimpleFileSystem>(fs_h) {
                if let Ok(mut root) = fs.open_volume() {
                    let mut dir: Directory = if path_str.is_empty() {
                        root
                    } else {
                        match root.open(uefi_path, FileMode::Read, FileAttribute::DIRECTORY) {
                            Ok(handle) => match handle.into_directory() {
                                Some(d) => d,
                                None => return 0,
                            },
                            Err(_) => return 0,
                        }
                    };

                    let mut info_buf = [0u8; 512];
                    while count < max_count {
                        // Korrektur: Kein <FileInfo> Tag hier nötig
                        if let Ok(Some(info)) = dir.read_entry(&mut info_buf) {
                            let dest = &mut *out_ptr.offset(count as isize);
                            let name_utf16 = info.file_name().to_u16_slice();
                            
                            for i in 0..31 {
                                if i < name_utf16.len() {
                                    let c = name_utf16[i];
                                    dest.name[i] = if c < 128 { c as u8 } else { b'?' };
                                } else {
                                    dest.name[i] = 0;
                                }
                            }
                            dest.name[31] = 0;

                            if (dest.name[0] | 0x20) == b'a' {
                                if !FB_PTR.is_null() {
                                    for p in 0..1000 { *FB_PTR.offset(p) = 0x0000FF00; }
                                }
                            }

                            dest.is_dir = if info.attribute().contains(FileAttribute::DIRECTORY) { 1 } else { 0 };
                            dest.size = info.file_size() as u32;
                            count += 1;
                        } else { break; }
                    }
                }
            }
        }
        count
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "win64" fn sys_file_write(path_ptr: *const u8, data_ptr: *const u8, size: usize) -> i32 {
    unsafe {
        if !sys_check_permission(0) { return -2; }
        let bs = &*BOOT_SERVICES_PTR;
        let path_str = core::ffi::CStr::from_ptr(path_ptr as *const i8).to_str().unwrap_or("");
        let mut buf = [0u16; 128];
        let uefi_path = CStr16::from_str_with_buf(path_str, &mut buf).unwrap();

        if let Ok(fs_h) = bs.get_handle_for_protocol::<SimpleFileSystem>() {
            if let Ok(mut fs) = bs.open_protocol_exclusive::<SimpleFileSystem>(fs_h) {
                if let Ok(mut root) = fs.open_volume() {
                    if let Ok(f_h) = root.open(uefi_path, FileMode::CreateReadWrite, FileAttribute::empty()) {
                        if let Some(mut file) = f_h.into_regular_file() {
                            let data = core::slice::from_raw_parts(data_ptr, size);
                            if file.write(data).is_ok() { return 0; }
                        }
                    }
                }
            }
        }
        -1
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "win64" fn sys_file_read(path_ptr: *const u8, buffer_ptr: *mut u8, max_size: usize) -> i32 {
    unsafe {
        let bs = &*BOOT_SERVICES_PTR;
        let path_str = core::ffi::CStr::from_ptr(path_ptr as *const i8).to_str().unwrap_or("");
        let mut buf = [0u16; 128];
        let uefi_path = CStr16::from_str_with_buf(path_str, &mut buf).unwrap();

        if let Ok(fs_h) = bs.get_handle_for_protocol::<SimpleFileSystem>() {
            if let Ok(mut fs) = bs.open_protocol_exclusive::<SimpleFileSystem>(fs_h) {
                if let Ok(mut root) = fs.open_volume() {
                    if let Ok(f_h) = root.open(uefi_path, FileMode::Read, FileAttribute::empty()) {
                        if let Some(mut file) = f_h.into_regular_file() {
                            let target = core::slice::from_raw_parts_mut(buffer_ptr, max_size);
                            if let Ok(read_size) = file.read(target) {
                                return read_size as i32;
                            }
                        }
                    }
                }
            }
        }
        -1
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "win64" fn sys_execute_app(path_ptr: *const u8) {
    unsafe {
        if BOOT_SERVICES_PTR.is_null() { return; }
        let bs = &*BOOT_SERVICES_PTR;
        let path_str = core::ffi::CStr::from_ptr(path_ptr as *const i8).to_str().unwrap_or("");
        let mut buf = [0u16; 128];
        let uefi_path = match CStr16::from_str_with_buf(path_str, &mut buf) {
            Ok(p) => p,
            Err(_) => {
                // LILA: Pfad-Konvertierung fehlgeschlagen
                if !FB_PTR.is_null() { for i in 0..50000 { *FB_PTR.offset(i) = 0xFF00FF; } }
                return;
            },
        };

        if let Ok(fs_h) = bs.get_handle_for_protocol::<SimpleFileSystem>() {
            if let Ok(mut fs) = bs.open_protocol_exclusive::<SimpleFileSystem>(fs_h) {
                if let Ok(mut root) = fs.open_volume() {
                    match root.open(uefi_path, FileMode::Read, FileAttribute::empty()) {
                        Ok(f_h) => {
                            if let Some(mut file) = f_h.into_regular_file() {
                                let app_address: u64 = 0x1000000;
                                let pages = 1024; 
                                
                                let _ = bs.free_pages(app_address, pages);
                                if let Ok(addr) = bs.allocate_pages(AllocateType::Address(app_address), MemoryType::LOADER_CODE, pages) {
                                    let ptr = addr as *mut u8;
                                    let target = core::slice::from_raw_parts_mut(ptr, pages * 4096);
                                    target.fill(0);
                                    
                                    if let Ok(_) = file.read(target) {
                                        // GRÜN: Datei geladen, wir springen jetzt!
                                        if !FB_PTR.is_null() { for i in 0..50000 { *FB_PTR.offset(i) = 0x00FF00; } }
                                        
                                        let mut entry_point = ptr;
                                        if *(ptr as *const u16) == 0x5A4D {
                                            let pe_off = *(ptr.offset(0x3C) as *const u32) as isize;
                                            let entry_rva = *(ptr.offset(pe_off + 0x28) as *const u32) as isize;
                                            entry_point = ptr.offset(entry_rva);
                                        }

                                        let syscalls = SyscallTable {
                                            fb_ptr: FB_PTR, stride: STRIDE as u32,
                                            get_time: sys_get_time, get_key: sys_get_key,
                                            reboot: sys_reboot, shutdown: sys_shutdown,
                                            execute_app: sys_execute_app, file_write: sys_file_write,
                                            list_files: sys_list_files, check_permission: sys_check_permission,
                                            file_read: sys_file_read,
                                        };
                                        let app_entry: unsafe extern "win64" fn(*const SyscallTable) = core::mem::transmute(entry_point);
                                        (app_entry)(&syscalls);
                                    } else {
                                        // ORANGE: Lesen fehlgeschlagen
                                        if !FB_PTR.is_null() { for i in 0..50000 { *FB_PTR.offset(i) = 0xFFA500; } }
                                    }
                                }
                            }
                        },
                        Err(_) => {
                            // ROT: Datei nicht gefunden!
                            if !FB_PTR.is_null() { for i in 0..50000 { *FB_PTR.offset(i) = 0xFF0000; } }
                        }
                    }
                }
            }
        }
    }
}

// --- ENTRY POINT ---

#[entry]
fn main(_handle: Handle, mut system_table: SystemTable<Boot>) -> Status {
    uefi_services::init(&mut system_table).unwrap();
    let boot_services = system_table.boot_services();
    
    unsafe { 
        BOOT_SERVICES_PTR = boot_services as *const BootServices; 
        RT_PTR = system_table.runtime_services() as *const RuntimeServices;
    }
    
    if let Ok(g_h) = boot_services.get_handle_for_protocol::<GraphicsOutput>() {
        if let Ok(mut gop) = boot_services.open_protocol_exclusive::<GraphicsOutput>(g_h) {
            unsafe {
                FB_PTR = gop.frame_buffer().as_mut_ptr() as *mut u32;
                STRIDE = gop.current_mode_info().resolution().0 as i32;
            }
        }
    }

    if let Ok(i_h) = boot_services.get_handle_for_protocol::<Input>() {
        if let Ok(mut input) = boot_services.open_protocol_exclusive::<Input>(i_h) {
            unsafe {
                // Korrektur: Wir nutzen direkt das dereferenzierte Objekt
                let _ = input.reset(false);
                while let Ok(Some(_)) = input.read_key() { }
                INTERNAL_INPUT = &mut *input as *mut Input;
                core::mem::forget(input);
            }
        }
    }

    unsafe { sys_execute_app("APPS\\MANAGER.BIN\0".as_ptr()); }

    loop { unsafe { asm!("hlt"); } }
}