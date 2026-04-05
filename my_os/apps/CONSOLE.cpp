extern "C" void __main() {} // Verhindert den MinGW-Linker-Fehler

#include "libos.h"
#include "display.h"

__attribute__((section(".text.entry")))
void main(const SyscallTable* sys) {
    unsigned int* fb = (unsigned int*)sys->fb_ptr;

    // Hintergrund & Fenster zeichnen
    draw_rectangle(fb, sys->stride, 250, 150, 500, 400, 0x001A1A1A);
    draw_window(fb, sys->stride, 250, 150, 500, 400, "SYSTEM CONSOLE", 0x00333333);

    draw_string(fb, sys->stride, 260, 180, "GeminiOS v0.1 - Terminal", 0x0000FF00);
    draw_string(fb, sys->stride, 260, 200, "root@kernel:~$ _", 0x00FFFFFF);

    while (1) {
        unsigned short key = sys->get_key();

        // F1 (0xFF0B) zum Schlieﬂen
        if (key == 0xFF0B) break;

        // Kurze Pause zur CPU-Entlastung
        for (volatile int i = 0; i < 10000; i++);
    }
    return;
}