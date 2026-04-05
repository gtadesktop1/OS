ENTRY(main)

SECTIONS
{
    . = 0x100000;

    .text : {
        *(.text.entry)
        *(.text)
        *(.text.*)
    }

    .rodata : {
        *(.rodata)
        *(.rodata.*)
    }

    .data : {
        *(.data)
        *(.data.*)
    }

    .bss : {
        *(.bss)
        *(.bss.*)
        *(COMMON)
    }

    /DISCARD/ : {
        *(.reloc)
        *(.pdata)
        *(.xdata)
        *(.note.GNU-stack)
        *(.comment)
        *(.eh_frame)
    }
}