use x86_64::structures::paging::OffsetPageTable;
use crate::memory::BootInfoFrameAllocator;

pub fn init_heap(
    _mapper: &mut OffsetPageTable,
    _frame_allocator: &mut BootInfoFrameAllocator,
) -> Result<(), ()> {
    Ok(())
}
