/* link.ld */
ENTRY(main)

SECTIONS
{
    . = 0;

    .text : {
        *(.text.entry)
        *(.text)
        *(.text*)
    }

    .rodata : {
        *(.rodata*)
    }

    .data : {
        *(.data*)
    }

    .bss : {
        *(.bss*)
        *(COMMON)
    }

    /* Diese Sektionen verursachen unter Windows die "Relocation" Fehler */
    /DISCARD/ : {
        *(.pdata*)
        *(.xdata*)
        *(.comment)
        *(.eh_frame)
        *(.note*)
        *(.rel*)
    }
}