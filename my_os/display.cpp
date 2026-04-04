#include "libos.h"

// Zweidimensionales Array: [Anzahl Zeichen][8 Zeilen pro Zeichen]
unsigned char font_data[31][8] = {
    {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}, // 0: Space
    {0x18, 0x3C, 0x66, 0x66, 0x7E, 0x66, 0x66, 0x00}, // 1: A
    {0x7C, 0x66, 0x66, 0x7C, 0x66, 0x66, 0x7C, 0x00}, // 2: B
    {0x3C, 0x66, 0x60, 0x60, 0x60, 0x66, 0x3C, 0x00}, // 3: C
    {0x78, 0x6C, 0x66, 0x66, 0x66, 0x6C, 0x78, 0x00}, // 4: D
    {0x7E, 0x60, 0x60, 0x78, 0x60, 0x60, 0x7E, 0x00}, // 5: E
    {0x7E, 0x60, 0x60, 0x78, 0x60, 0x60, 0x60, 0x00}, // 6: F
    {0x3C, 0x66, 0x60, 0x6E, 0x66, 0x66, 0x3C, 0x00}, // 7: G
    {0x66, 0x66, 0x66, 0x7E, 0x66, 0x66, 0x66, 0x00}, // 8: H
    {0x3C, 0x18, 0x18, 0x18, 0x18, 0x18, 0x3C, 0x00}, // 9: I
    {0x1E, 0x0C, 0x0C, 0x0C, 0x0C, 0x6C, 0x38, 0x00}, // 10: J
    {0x66, 0x6C, 0x78, 0x70, 0x78, 0x6C, 0x66, 0x00}, // 11: K
    {0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x7E, 0x00}, // 12: L
    {0x63, 0x77, 0x7F, 0x6B, 0x63, 0x63, 0x63, 0x00}, // 13: M
    {0x66, 0x6E, 0x76, 0x66, 0x66, 0x66, 0x66, 0x00}, // 14: N
    {0x3C, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3C, 0x00}, // 15: O
    {0x7C, 0x66, 0x66, 0x7C, 0x60, 0x60, 0x60, 0x00}, // 16: P
    {0x3C, 0x66, 0x66, 0x66, 0x66, 0x3C, 0x0E, 0x01}, // 17: Q
    {0x7C, 0x66, 0x66, 0x7C, 0x78, 0x6C, 0x66, 0x00}, // 18: R
    {0x3C, 0x66, 0x60, 0x3C, 0x06, 0x66, 0x3C, 0x00}, // 19: S
    {0x7E, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x00}, // 20: T
    {0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3C, 0x00}, // 21: U
    {0x66, 0x66, 0x66, 0x66, 0x66, 0x3C, 0x18, 0x00}, // 22: V
    {0x63, 0x63, 0x63, 0x6B, 0x7F, 0x77, 0x63, 0x00}, // 23: W
    {0x66, 0x66, 0x3C, 0x18, 0x3C, 0x66, 0x66, 0x00}, // 24: X
    {0x66, 0x66, 0x66, 0x3C, 0x18, 0x18, 0x18, 0x00}, // 25: Y
    {0x7E, 0x06, 0x0C, 0x18, 0x30, 0x60, 0x7E, 0x00}, // 26: Z
    {0x00, 0x18, 0x18, 0x00, 0x18, 0x18, 0x00, 0x00}, // 27: :
    {0x00, 0x00, 0x00, 0x7E, 0x00, 0x00, 0x00, 0x00}, // 28: -
    {0x3C, 0x66, 0x6E, 0x7E, 0x76, 0x66, 0x3C, 0x00}, // 29: 0
    {0x18, 0x38, 0x18, 0x18, 0x18, 0x18, 0x7E, 0x00}  // 30: 1
};

extern "C" {
    void draw_rectangle(unsigned int* fb, int stride, int x, int y, int w, int h, unsigned int color) {
        if (!fb) return;
        for (int i = 0; i < h; i++) {
            for (int j = 0; j < w; j++) {
                fb[(y + i) * stride + (x + j)] = color;
            }
        }
    }

    int get_font_index(char c) {
        if (c >= 'a' && c <= 'z') c -= 32;
        if (c >= 'A' && c <= 'Z') return (c - 'A' + 1);
        if (c == ' ') return 0;
        if (c == ':') return 27;
        if (c == '-') return 28;
        if (c == '0') return 29;
        if (c == '1') return 30;
        return 0;
    }

    void draw_char(unsigned int* fb, int stride, int x, int y, char c, unsigned int color) {
        int font_idx = get_font_index(c);
        for (int i = 0; i < 8; i++) {
            unsigned char line = font_data[font_idx][i];
            for (int j = 0; j < 8; j++) {
                if (line & (1 << (7 - j))) {
                    fb[(y + i) * stride + (x + j)] = color;
                }
            }
        }
    }

    void draw_string(unsigned int* fb, int stride, int x, int y, const char* str, unsigned int color) {
        for (int i = 0; str[i] != '\0'; i++) {
            draw_char(fb, stride, x + (i * 8), y, str[i], color);
        }
    }

    int is_point_in_rect(int px, int py, int rx, int ry, int rw, int rh) {
        return (px >= rx && px <= (rx + rw) && py >= ry && py <= (ry + rh));
    }

    void draw_desktop(unsigned int* fb, int stride, int width, int height) {
        draw_rectangle(fb, stride, 0, 0, width, height, 0x001A456E);
        int bar_height = 40;
        draw_rectangle(fb, stride, 0, height - bar_height, width, bar_height, 0x00C0C0C0);
        draw_rectangle(fb, stride, 0, height - bar_height, width, 1, 0x00FFFFFF);
        draw_string(fb, stride, 15, height - 25, "START", 0x00000000);
    }

    void draw_window(unsigned int* fb, int stride, int x, int y, int w, int h, const char* title, unsigned int color) {
        draw_rectangle(fb, stride, x + 4, y + 4, w, h, 0x00101010);
        draw_rectangle(fb, stride, x, y, w, h, color);
        int title_height = 25;
        draw_rectangle(fb, stride, x, y, w, title_height, 0x00000080);
        draw_rectangle(fb, stride, x, y, w, 1, 0x00FFFFFF);
        draw_string(fb, stride, x + 8, y + 6, title, 0x00FFFFFF);
        int btn_size = 18;
        draw_rectangle(fb, stride, x + w - btn_size - 4, y + 4, btn_size, btn_size, 0x00FF0000);
    }

    // --- FIX: WM_INIT ---
    void wm_init(const SyscallTable* sys) {
        if (!sys || !sys->fb_ptr) return;

        // Wir erzwingen den Cast so hart wie möglich
        unsigned int* fb = (unsigned int*)sys->fb_ptr;

        draw_desktop(sys->fb_ptr, sys->stride, 1024, 768);
    }

    void draw_mouse(unsigned int* fb, int stride, int x, int y, unsigned int color) {
        unsigned char mouse_bitmap[12] = {
            0b10000000, 0b11000000, 0b11100000, 0b11110000,
            0b11111000, 0b11111100, 0b11111110, 0b11111111,
            0b11111000, 0b11011000, 0b10001100, 0b00000000
        };
        for (int i = 0; i < 12; i++) {
            for (int j = 0; j < 8; j++) {
                if (mouse_bitmap[i] & (1 << (7 - j))) {
                    fb[(y + i) * stride + (x + j)] = color;
                }
            }
        }
    }
}