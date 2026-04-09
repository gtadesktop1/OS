#![no_std]
#![no_main]
#![feature(abi_x86_interrupt)]

use core::panic::PanicInfo;
use bootloader::{entry_point, BootInfo};

mod vga_buffer;
mod serial;
mod gdt;
mod interrupts;
mod memory;
mod allocator;
mod task;

entry_point!(kernel_main);

fn kernel_main(boot_info: &'static BootInfo) -> ! {
    use memory::BootInfoFrameAllocator;
    use x86_64::VirtAddr;

    println!("NTFS-OS Kernel v0.1.0-alpha");
    println!("Initializing GDT...");
    gdt::init();
    println!("Initializing Interrupts...");
    interrupts::init_idt();
    unsafe { interrupts::PICS.lock().initialize() };
    x86_64::instructions::interrupts::enable();

    println!("Initializing Memory Mapping...");
    let phys_mem_offset = VirtAddr::new(boot_info.physical_memory_offset);
    let mut mapper = unsafe { memory::init(phys_mem_offset) };
    let mut frame_allocator = unsafe {
        BootInfoFrameAllocator::init(&boot_info.memory_map)
    };

    println!("Initializing Heap Allocator...");
    allocator::init_heap(&mut mapper, &mut frame_allocator)
        .expect("heap initialization failed");

    println!("Initializing Network Stack (Simulated P2P)...");
    
    println!("Starting OS_UI Frontend...");
    
    println!("Kernel initialized. Entering main loop.");
    
    let mut executor = task::executor::Executor::new();
    executor.run();
}

#[panic_handler]
fn panic(info: &PanicInfo) -> ! {
    println!("{}", info);
    loop {}
}
