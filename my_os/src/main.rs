#![no_std]
#![no_main]

extern crate alloc;

use alloc::boxed::Box;
use alloc::vec::Vec;

use uefi::prelude::*;
use uefi::proto::console::text::{Input, Key};
use uefi::proto::console::gop::GraphicsOutput;
use uefi::proto::media::file::{
    File, FileAttribute, FileMode, FileInfo, Directory,
};
use uefi::proto::media::fs::SimpleFileSystem;
use uefi::table::boot::{AllocateType, MemoryType};
use uefi::table::runtime::ResetType;
use uefi::{CStr16, Status};
use core::arch::asm;

// ── Globale Statiken ─────────────────────────────────────────

static mut FB_PTR:            *mut u32       = core::ptr::null_mut();
static mut STRIDE:            i32            = 0;
static mut INTERNAL_INPUT:    *mut Input     = core::ptr::null_mut();
static mut RT_PTR:            *const uefi::table::runtime::RuntimeServices
                                             = core::ptr::null();
static mut BOOT_SERVICES_PTR: *const BootServices = core::ptr::null();
static mut CURRENT_USER_LEVEL: u32           = 0;

// ── Strukturen ───────────────────────────────────────────────

#[repr(C, packed)]
pub struct FileEntry {
    pub name:   [u8; 32],
    pub is_dir: u8,
    pub size:   u32,
}

#[repr(C)]
pub struct SyscallTable {
    pub fb_ptr:           *mut u32,
    pub stride:           u32,
    pub get_time:         unsafe extern "win64" fn(*mut u16, *mut u16, *mut u16),
    pub get_key:          unsafe extern "win64" fn() -> u16,
    pub reboot:           unsafe extern "win64" fn(),
    pub shutdown:         unsafe extern "win64" fn(),
    pub execute_app:      unsafe extern "win64" fn(*const u8),
    pub file_write:       unsafe extern "win64" fn(*const u8, *const u8, usize) -> i32,
    pub list_files:       unsafe extern "win64" fn(*const u8, *mut FileEntry, u32) -> u32,
    pub check_permission: unsafe extern "win64" fn(u32) -> bool,
    pub file_read:        unsafe extern "win64" fn(*const u8, *mut u8, usize) -> i32,
}

// ── Syscalls ─────────────────────────────────────────────────

#[unsafe(no_mangle)]
pub extern "win64" fn sys_get_key() -> u16 {
    unsafe {
        if INTERNAL_INPUT.is_null() { return 0; }
        let input = &mut *INTERNAL_INPUT;
        match input.read_key() {
            Ok(Some(Key::Printable(c))) => u16::from(c),
            Ok(Some(Key::Special(s)))   => 0xFF00 | (s.0 as u16),
            _ => 0,
        }
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "win64" fn sys_get_time(h: *mut u16, m: *mut u16, s: *mut u16) {
    unsafe {
        if RT_PTR.is_null() { return; }
        if let Ok(t) = (*RT_PTR).get_time() {
            if !h.is_null() { *h = t.hour()   as u16; }
            if !m.is_null() { *m = t.minute()  as u16; }
            if !s.is_null() { *s = t.second()  as u16; }
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
pub unsafe extern "win64" fn sys_list_files(
    path_ptr:  *const u8,
    out_ptr:   *mut FileEntry,
    max_count: u32,
) -> u32 {
    unsafe {
        if BOOT_SERVICES_PTR.is_null() { return 0; }
        let bs = &*BOOT_SERVICES_PTR;
        let path_str = core::ffi::CStr::from_ptr(path_ptr as *const i8)
            .to_str().unwrap_or("");

        let handles = match bs.find_handles::<SimpleFileSystem>() {
            Ok(h) => h, Err(_) => return 0,
        };

        for &h in &handles {
            // Scope-Block: ScopedProtocol wird nach dem Lesen sofort freigegeben
            let count = {
                let Ok(mut fs) = bs.open_protocol_exclusive::<SimpleFileSystem>(h)
                    else { continue };
                let Ok(mut root) = fs.open_volume() else { continue };

                let mut dir: Directory = if path_str.is_empty() {
                    root
                } else {
                    let mut buf = [0u16; 128];
                    let Ok(cpath) = CStr16::from_str_with_buf(path_str, &mut buf)
                        else { continue };
                    match root.open(cpath, FileMode::Read, FileAttribute::DIRECTORY) {
                        Ok(fh) => match fh.into_directory() {
                            Some(d) => d, None => continue,
                        },
                        Err(_) => continue,
                    }
                };

                let mut count = 0u32;
                let mut info_buf = [0u8; 512];
                while count < max_count {
                    match dir.read_entry(&mut info_buf) {
                        Ok(Some(info)) => {
                            let dest = &mut *out_ptr.offset(count as isize);
                            let name_utf16 = info.file_name().to_u16_slice();
                            for i in 0..31 {
                                dest.name[i] = if i < name_utf16.len() {
                                    let c = name_utf16[i];
                                    if c < 128 { c as u8 } else { b'?' }
                                } else { 0 };
                            }
                            dest.name[31] = 0;
                            dest.is_dir = if info.attribute()
                                .contains(FileAttribute::DIRECTORY) { 1 } else { 0 };
                            dest.size = info.file_size() as u32;
                            count += 1;
                        }
                        _ => break,
                    }
                }
                count
                // ScopedProtocol fs wird hier freigegeben
            };
            if count > 0 { return count; }
        }
        0
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "win64" fn sys_file_write(
    path_ptr: *const u8,
    data_ptr: *const u8,
    size:     usize,
) -> i32 {
    unsafe {
        if !sys_check_permission(0) { return -2; }
        if BOOT_SERVICES_PTR.is_null() { return -1; }
        let bs = &*BOOT_SERVICES_PTR;
        let path_str = core::ffi::CStr::from_ptr(path_ptr as *const i8)
            .to_str().unwrap_or("");

        let handles = match bs.find_handles::<SimpleFileSystem>() {
            Ok(h) => h, Err(_) => return -1,
        };
        for &h in &handles {
            let result = {
                let Ok(mut fs) = bs.open_protocol_exclusive::<SimpleFileSystem>(h)
                    else { continue };
                let Ok(mut root) = fs.open_volume() else { continue };
                let mut buf = [0u16; 128];
                let Ok(cpath) = CStr16::from_str_with_buf(path_str, &mut buf)
                    else { continue };
                if let Ok(fh) = root.open(cpath, FileMode::CreateReadWrite, FileAttribute::empty()) {
                    if let Some(mut file) = fh.into_regular_file() {
                        let data = core::slice::from_raw_parts(data_ptr, size);
                        if file.write(data).is_ok() { 0i32 } else { -1 }
                    } else { -1 }
                } else { -1 }
            };
            if result == 0 { return 0; }
        }
        -1
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "win64" fn sys_file_read(
    path_ptr:   *const u8,
    buffer_ptr: *mut u8,
    max_size:   usize,
) -> i32 {
    unsafe {
        if BOOT_SERVICES_PTR.is_null() { return -1; }
        let bs = &*BOOT_SERVICES_PTR;
        let path_str = core::ffi::CStr::from_ptr(path_ptr as *const i8)
            .to_str().unwrap_or("");

        let handles = match bs.find_handles::<SimpleFileSystem>() {
            Ok(h) => h, Err(_) => return -1,
        };
        for &h in &handles {
            let n = {
                let Ok(mut fs) = bs.open_protocol_exclusive::<SimpleFileSystem>(h)
                    else { continue };
                let Ok(mut root) = fs.open_volume() else { continue };
                let mut buf = [0u16; 128];
                let Ok(cpath) = CStr16::from_str_with_buf(path_str, &mut buf)
                    else { continue };
                if let Ok(fh) = root.open(cpath, FileMode::Read, FileAttribute::empty()) {
                    if let Some(mut file) = fh.into_regular_file() {
                        let target = core::slice::from_raw_parts_mut(buffer_ptr, max_size);
                        if let Ok(n) = file.read(target) { n as i32 } else { -1 }
                    } else { -1 }
                } else { -1 }
            };
            if n >= 0 { return n; }
        }
        -1
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "win64" fn sys_execute_app(path_ptr: *const u8) {
    unsafe {
        if BOOT_SERVICES_PTR.is_null() { return; }
        let bs = &*BOOT_SERVICES_PTR;
        let path_str = core::ffi::CStr::from_ptr(path_ptr as *const i8)
            .to_str().unwrap_or("");

        let mut path_buf = [0u16; 128];
        let cpath = match CStr16::from_str_with_buf(path_str, &mut path_buf) {
            Ok(p) => p,
            Err(_) => { draw_signal(0xFF00FF); return; }
        };

        let handles = match bs.find_handles::<SimpleFileSystem>() {
            Ok(h) => h, Err(_) => return,
        };

        const PAGES:     usize = 1024;
        const LOAD_ADDR: u64   = 0x0100_0000;

        for &fs_h in &handles {
            // ── KRITISCHER FIX ────────────────────────────────
            // Filesystem-Zugriff im eigenen Scope-Block:
            // open_protocol_exclusive haelt einen exklusiven Lock
            // auf den SFS-Handle. Wenn wir die App aufrufen und
            // die App dann wieder execute_app aufruft (reentrant),
            // wuerde open_protocol_exclusive fuer denselben Handle
            // fehlschlagen → roter Balken.
            //
            // Loesung: fs (ScopedProtocol) am Ende des Blocks
            // droppen → Lock freigegeben → naechster Aufruf klappt.
            let read_ok = {
                let Ok(mut fs) = bs.open_protocol_exclusive::<SimpleFileSystem>(fs_h)
                    else { continue };
                let Ok(mut root) = fs.open_volume() else { continue };

                let fh = match root.open(cpath, FileMode::Read, FileAttribute::empty()) {
                    Ok(f) => f, Err(_) => continue,
                };
                let Some(mut file) = fh.into_regular_file() else { continue };

                let _ = bs.free_pages(LOAD_ADDR, PAGES);
                let Ok(addr) = bs.allocate_pages(
                    AllocateType::Address(LOAD_ADDR),
                    MemoryType::LOADER_CODE,
                    PAGES,
                ) else { continue };

                let ptr = addr as *mut u8;
                core::slice::from_raw_parts_mut(ptr, PAGES * 4096).fill(0);

                let ok = file.read(
                    core::slice::from_raw_parts_mut(ptr, PAGES * 4096)
                ).is_ok();
                ok
                // ← fs wird HIER freigegeben, VOR dem App-Sprung
            };

            if !read_ok { continue; }

            // Handle ist jetzt frei → App starten
            let ptr = LOAD_ADDR as *mut u8;
            draw_signal(0x00_FF_00);

            let entry_point: *mut u8 =
                if (ptr as *const u16).read_unaligned() == 0x5A4D {
                    let pe_off = (ptr.add(0x3C) as *const u32).read_unaligned() as isize;
                    if (ptr.offset(pe_off) as *const u32).read_unaligned() == 0x0000_4550 {
                        let rva = (ptr.offset(pe_off + 0x28) as *const u32)
                            .read_unaligned() as isize;
                        ptr.offset(rva)
                    } else { ptr }
                } else {
                    ptr
                };

            let syscalls = Box::new(SyscallTable {
                fb_ptr:           FB_PTR,
                stride:           STRIDE as u32,
                get_time:         sys_get_time,
                get_key:          sys_get_key,
                reboot:           sys_reboot,
                shutdown:         sys_shutdown,
                execute_app:      sys_execute_app,
                file_write:       sys_file_write,
                list_files:       sys_list_files,
                check_permission: sys_check_permission,
                file_read:        sys_file_read,
            });
            let syscalls_ptr = Box::into_raw(syscalls);
            let app_main: unsafe extern "win64" fn(*const SyscallTable) =
                core::mem::transmute(entry_point);
            app_main(syscalls_ptr);
            drop(Box::from_raw(syscalls_ptr));
            return;
        }

        draw_signal(0xFF_00_00); // Kein Handle hat die Datei gefunden
    }
}

// ── Hilfsfunktionen ──────────────────────────────────────────

unsafe fn draw_signal(color: u32) {
    if !FB_PTR.is_null() {
        for i in 0..50_000isize { *FB_PTR.offset(i) = color; }
    }
}

// ── Entry Point ──────────────────────────────────────────────

#[entry]
fn main(_handle: Handle, mut system_table: SystemTable<Boot>) -> Status {
    uefi_services::init(&mut system_table).unwrap();
    let bt = system_table.boot_services();

    unsafe {
        BOOT_SERVICES_PTR = bt as *const BootServices;
        RT_PTR = system_table.runtime_services()
            as *const uefi::table::runtime::RuntimeServices;
    }

    if let Ok(g_h) = bt.get_handle_for_protocol::<GraphicsOutput>() {
        if let Ok(mut gop) = bt.open_protocol_exclusive::<GraphicsOutput>(g_h) {
            unsafe {
                FB_PTR = gop.frame_buffer().as_mut_ptr() as *mut u32;
                STRIDE = gop.current_mode_info().resolution().0 as i32;
            }
        }
    }

    if let Ok(i_h) = bt.get_handle_for_protocol::<Input>() {
        if let Ok(mut input) = bt.open_protocol_exclusive::<Input>(i_h) {
            unsafe {
                let _ = input.reset(false);
                while let Ok(Some(_)) = input.read_key() {}
                INTERNAL_INPUT = &mut *input as *mut Input;
                core::mem::forget(input);
            }
        }
    }

    unsafe { sys_execute_app("APPS\\MANAGER.BIN\0".as_ptr()); }

    loop { unsafe { asm!("hlt"); } }
}