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

// Scancodes
#define KEY_UP    0xFF01
#define KEY_DOWN  0xFF02
#define KEY_F1    0xFF0B
#define KEY_F2    0xFF0C
#define KEY_F3    0xFF0D
#define KEY_F4    0xFF0E
#define KEY_F5    0xFF0F
#define KEY_ENTER 0x000D

// Hilfsfunktion: Sucht im Root nach dem APPS Ordner und führt die Datei aus
void run(const SyscallTable* sys, const char* filename) {
    unsigned int* fb = (unsigned int*)sys->fb_ptr;
    FileEntry entries[64];

    // 1. Root auflisten, um zu sehen ob der Ordner "APPS" existiert
    // Wir übergeben einen leeren String für das Hauptverzeichnis
    unsigned int count = sys->list_files("", entries, 16);

    int apps_found = 0;
    for (unsigned int i = 0; i < count; i++) {
        // Wir prüfen: Ist es ein Verzeichnis? 
        // Und fängt der Name mit 'A'/'a' und 'P'/'p' an?
        if (entries[i].is_dir) {
            char c1 = entries[i].name[0];
            char c2 = entries[i].name[1];

            if ((c1 == 'A' || c1 == 'a') && (c2 == 'P' || c2 == 'p')) {
                apps_found = 1;
                break;
            }
        }
    }

    // Wenn nach dem Scan der 16 Einträge nichts gefunden wurde -> GELB
    if (!apps_found) {
        draw_rectangle(fb, sys->stride, 0, 738, 1024, 30, 0x00FFFF00); // Gelb
        return;
    }

    // 2. Pfad für den Kernel zusammenbauen (Format: APPS\DATEI.BIN)
    char full_path[128];
    const char* prefix = "APPS\\";

    int p = 0;
    while (prefix[p]) {
        full_path[p] = prefix[p];
        p++;
    }

    int f = 0;
    while (filename[f]) {
        full_path[p + f] = filename[f];
        f++;
    }
    full_path[p + f] = '\0'; // Wichtige Null-Terminierung für Rust

    // 3. Ausführen
    // Wir zeichnen kurz Blau, um zu signalisieren: "Manager übergibt an Kernel"
    draw_rectangle(fb, sys->stride, 0, 738, 1024, 30, 0x000000FF); // Blau

    sys->execute_app((const unsigned char*)full_path);

    // Falls die App beendet wird oder der Kernel bei execute_app scheitert (ROT),
    // setzen wir hier den Manager-Status zurück.
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
        const char* menu[] = { "[F1] CONSOLE", "[F2] REBOOT", "[F3] SHUTDOWN", "[E] SETTINGS" };
        for (int i = 0; i < 4; i++) {
            unsigned int bg = (i == selected_item) ? 0x00000080 : 0x00C0C0C0;
            unsigned int fg = (i == selected_item) ? 0x00FFFFFF : 0x00000000;
            draw_rectangle(fb, sys->stride, 10, 460 + (i * 30), 190, 25, bg);
            draw_string(fb, sys->stride, 15, 465 + (i * 30), (char*)menu[i], fg);
        }
    }

    char t_str[9];
    get_corrected_time(sys, t_str);
    draw_string(fb, sys->stride, 940, 742, t_str, 0x00000000);
}

__attribute__((section(".text.entry")))
void main(const SyscallTable* sys) {
    wm_init(sys);
    full_refresh(sys);
    unsigned short last_s = 99;

    while (1) {
        unsigned short h, m, s;
        sys->get_time(&h, &m, &s);
        if (s != last_s) {
            full_refresh(sys);
            last_s = s;
        }

        unsigned short key = sys->get_key();
        if (key != 0) {
            switch (key) {
            case KEY_F5:
                start_menu_open = !start_menu_open;
                full_refresh(sys);
                break;
            case KEY_F4:
                start_menu_open = 0;
                full_refresh(sys);
                break;
            case KEY_F1:
                run(sys, "CONSOLE.BIN");
                full_refresh(sys);
                break;
            case KEY_F2: sys->reboot(); break;
            case KEY_F3: sys->shutdown(); break;
            case 'e':
            case 'E':
                run(sys, "SETTINGS.BIN");
                full_refresh(sys);
                break;
            case KEY_UP:
                if (start_menu_open && selected_item > 0) {
                    selected_item--;
                    full_refresh(sys);
                }
                break;
            case KEY_DOWN:
                if (start_menu_open && selected_item < 3) {
                    selected_item++;
                    full_refresh(sys);
                }
                break;
            case KEY_ENTER:
                if (start_menu_open) {
                    if (selected_item == 0) run(sys, "CONSOLE.BIN");
                    if (selected_item == 1) sys->reboot();
                    if (selected_item == 2) sys->shutdown();
                    if (selected_item == 3) run(sys, "SETTINGS.BIN");
                    start_menu_open = 0;
                    full_refresh(sys);
                }
                break;
            }
        }
        for (volatile int i = 0; i < 50; i++);
    }
}