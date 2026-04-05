ENTRY(main)

SECTIONS
{
    /* Basisadresse fuer UEFI Apps */
    . = 0x1000000;

    .text : ALIGN(4096)
    {
        *(.text.entry)
        *(.text)
        *(.text.*)
    }

    .rodata : ALIGN(4096)
    {
        *(.rodata)
        *(.rodata.*)
    }

    .data : ALIGN(4096)
    {
        *(.data)
        *(.data.*)
    }

    .bss : ALIGN(4096)
    {
        *(.bss)
        *(.bss.*)
        *(COMMON)
    }

    /* Entferne unnoetige Metadaten, die __main Fehler verursachen koennten */
    /DISCARD/ :
    {
        *(.note.GNU-stack)
        *(.comment)
        *(.eh_frame)
    }
}