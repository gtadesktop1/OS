use x86_64::{VirtAddr, structures::paging::OffsetPageTable};
use bootloader::bootinfo::MemoryMap;

pub unsafe fn init(_phys_mem_offset: VirtAddr) -> OffsetPageTable<'static> {
    unimplemented!()
}

pub struct BootInfoFrameAllocator {
    _memory_map: &'static MemoryMap,
}

impl BootInfoFrameAllocator {
    pub unsafe fn init(memory_map: &'static MemoryMap) -> Self {
        BootInfoFrameAllocator { _memory_map: memory_map }
    }
}
