extern "C" void __main() {} // Verhindert den MinGW-Linker-Fehler

#include "libos.h"
#include "display.h"

__attribute__((section(".text.entry")))
void main(const SyscallTable* sys) {
    unsigned int* fb = (unsigned int*)sys->fb_ptr;

    draw_window(fb, sys->stride, 300, 200, 400, 300, "SETTINGS", 0x00C0C0C0);

    draw_string(fb, sys->stride, 320, 240, "Resolution: 1024x768", 0x00000000);
    draw_string(fb, sys->stride, 320, 260, "User Level: ROOT", 0x00000000);
    draw_string(fb, sys->stride, 320, 300, "Press ESC or F5 to exit", 0x00555555);

    while (1) {
        unsigned short key = sys->get_key();

        // F5 (0xFF0F) oder ESC (0x1B) zum Schlieﬂen
        if (key == 0xFF0F || key == 0x1B) break;

        for (volatile int i = 0; i < 10000; i++);
    }
}