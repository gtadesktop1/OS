#ifdef __cplusplus
extern "C" {
#endif
    void __main() {}
#ifdef __cplusplus
}
#endif

#include "libos.h"
#include "display.h"

static int start_menu_open = 0;
static int selected_item = 0;

#define KEY_UP    0xFF01
#define KEY_DOWN  0xFF02
#define KEY_F1    0xFF0B
#define KEY_F2    0xFF0C
#define KEY_F3    0xFF0D
#define KEY_F4    0xFF0E
#define KEY_F5    0xFF0F
#define KEY_ENTER 0x000D
#define KEY_KILL  0xDEAD // Unser spezieller Kernel-Code für "Schließen erzwingen"

void run(const SyscallTable* sys, const char* filename) {
    unsigned int* fb = (unsigned int*)sys->fb_ptr;

    char full_path[128];
    const char* prefix = "APPS\\";
    int p = 0;
    while (prefix[p]) { full_path[p] = prefix[p]; p++; }
    int f = 0;
    while (filename[f]) { full_path[p + f] = filename[f]; f++; }
    full_path[p + f] = '\0';

    // UI Vorbereitung
    draw_rectangle(fb, sys->stride, 0, 738, 1024, 30, 0x00000000);
    draw_string(fb, sys->stride, 10, 742, "Running: ", 0x00FFFFFF);
    draw_string(fb, sys->stride, 80, 742, (char*)filename, 0x0000FF00);

    // Ausführung der App. 
    // Der Kernel-Syscall sys_get_key wird 0xDEAD zurückgeben, wenn F4 gedrückt wird.
    // Das beendet die App-Laufzeit im Kernel-Kontext und kehrt hierher zurück.
    sys->execute_app((const unsigned char*)full_path);

    // Nach der App: Alles säubern
    start_menu_open = 0;
}

void get_corrected_time(const SyscallTable* sys, char* out) {
    unsigned short h, m, s;
    sys->get_time(&h, &m, &s);
    h = (h + 2) % 24;
    out[0] = (h / 10) + '0'; out[1] = (h % 10) + '0'; out[2] = ':';
    out[3] = (m / 10) + '0'; out[4] = (m % 10) + '0'; out[5] = ':';
    out[6] = (s / 10) + '0'; out[7] = (s % 10) + '0'; out[8] = '\0';
}

void full_refresh(const SyscallTable* sys) {
    unsigned int* fb = (unsigned int*)sys->fb_ptr;
    draw_desktop(fb, sys->stride, 1024, 768);

    if (start_menu_open) {
        draw_window(fb, sys->stride, 5, 428, 200, 300, "SYSTEM", 0x00C0C0C0);
        const char* menu[] = {
            "[F1] CONSOLE", "[F2] REBOOT", "[F3] SHUTDOWN", "[E] SETTINGS"
        };
        for (int i = 0; i < 4; i++) {
            unsigned int bg = (i == selected_item) ? 0x00000080 : 0x00C0C0C0;
            unsigned int fg = (i == selected_item) ? 0x00FFFFFF : 0x00000000;
            draw_rectangle(fb, sys->stride, 10, 460 + (i * 30), 190, 25, bg);
            draw_string(fb, sys->stride, 15, 465 + (i * 30), (char*)menu[i], fg);
        }
    }

    // Taskleiste
    draw_rectangle(fb, sys->stride, 0, 738, 1024, 30, 0x000000FF);
    char t_str[9];
    get_corrected_time(sys, t_str);
    draw_string(fb, sys->stride, 940, 742, t_str, 0x00FFFFFF);
    draw_string(fb, sys->stride, 10, 742, "Start [F5] | Close [F4]", 0x00FFFFFF);
}

__attribute__((section(".text.entry")))
void main(const SyscallTable* sys) {
    wm_init(sys);
    full_refresh(sys);

    unsigned short last_s = 99;
    while (1) {
        unsigned short h, m, s;
        sys->get_time(&h, &m, &s);
        if (s != last_s) { full_refresh(sys); last_s = s; }

        unsigned short key = sys->get_key();

        // Der Manager filtert HIER alle Tasten.
        if (key != 0) {
            if (key == KEY_F5) {
                start_menu_open = !start_menu_open;
                full_refresh(sys);
            }
            else if (key == KEY_F2) {
                sys->reboot();
            }
            else if (key == KEY_F3) {
                sys->shutdown();
            }
            else if (key == KEY_F1) {
                run(sys, "CONSOLE.BIN");
                full_refresh(sys);
            }
            else if (key == 'e' || key == 'E') {
                run(sys, "SETTINGS.BIN");
                full_refresh(sys);
            }
            else if (key == KEY_UP && start_menu_open) {
                if (selected_item > 0) { selected_item--; full_refresh(sys); }
            }
            else if (key == KEY_DOWN && start_menu_open) {
                if (selected_item < 3) { selected_item++; full_refresh(sys); }
            }
            else if (key == KEY_ENTER && start_menu_open) {
                if (selected_item == 0) run(sys, "CONSOLE.BIN");
                if (selected_item == 1) sys->reboot();
                if (selected_item == 2) sys->shutdown();
                if (selected_item == 3) run(sys, "SETTINGS.BIN");
                start_menu_open = 0;
                full_refresh(sys);
            }
            // Falls es keine Systemtaste ist, würde sie normalerweise an die App gehen.
            // Aber da der Manager hier im "Idle" ist, ignorieren wir sie einfach.
        }
        for (volatile int i = 0; i < 100; i++);
    }
}