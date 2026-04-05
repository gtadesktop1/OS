#ifdef __cplusplus
extern "C" {
#endif
    void __main() {}
#ifdef __cplusplus
}
#endif

#include "libos.h"
#include "display.h"
#include <string.h>  // Für strncasecmp

// Globale Zustände
static int start_menu_open = 0;
static int selected_item = 0;

// Scancode-Definitionen
#define KEY_UP    0xFF01
#define KEY_DOWN  0xFF02
#define KEY_F1    0xFF0B
#define KEY_F2    0xFF0C
#define KEY_F3    0xFF0D
#define KEY_F4    0xFF0E
#define KEY_F5    0xFF0F
#define KEY_ENTER 0x000D

// Rekursive Funktion zum Finden des APPS-Ordners
int find_apps_folder(const SyscallTable* sys, const char* path) {
    FileEntry entries[64];
    unsigned int count = sys->list_files(path, entries, 64, 0);
    char full_path[128];  // Puffer für Pfadkonstruktion

    for (unsigned int i = 0; i < count; i++) {
        if (entries[i].is_dir) {
            // Case-insensitive Vergleich für "APPS"
            if (strncasecmp(entries[i].name, "APPS", 4) == 0) {
                return 1;  // APPS-Ordner gefunden
            }

            // Rekursiver Aufruf für Unterverzeichnisse
            snprintf(full_path, sizeof(full_path), "%s/%s", path, entries[i].name);
            if (find_apps_folder(sys, full_path)) {
                return 1;
            }
        }
    }
    return 0;  // Nicht gefunden
}

// App-Ausführungsfunktion
void run(const SyscallTable* sys, const char* filename) {
    unsigned int* fb = (unsigned int*)sys->fb_ptr;
    FileEntry entries[64];

    // 1. Prüfe auf APPS-Ordner (jetzt rekursiv)
    int apps_found = find_apps_folder(sys, "");

    if (!apps_found) {
        // Visuelles Feedback: Gelber Balken
        draw_rectangle(fb, sys->stride, 0, 738, 1024, 30, 0x00FFFF00);
        return;
    }

    // 2. Konstruiere vollständigen Pfad zu APPS\<filename>.BIN
    char full_path[128];
    const char* prefix = "APPS\\";
    int p = 0;

    // Kopiere Prefix
    while (prefix[p]) {
        full_path[p] = prefix[p];
        p++;
    }

    // Kopiere Filename
    int f = 0;
    while (filename[f]) {
        full_path[p + f] = filename[f];
        f++;
    }
    full_path[p + f] = '\0';  // Null-Terminierung

    // 3. Visuelles Feedback vor Ausführung
    draw_rectangle(fb, sys->stride, 0, 738, 1024, 30, 0x000000FF);  // Blau

    // 4. App ausführen
    sys->execute_app((const unsigned char*)full_path);

    // 5. Bei Rückkehr: Startmenü schließen
    start_menu_open = 0;
}

// Zeitformatierungsfunktion
void get_corrected_time(const SyscallTable* sys, char* out) {
    unsigned short h, m, s;
    sys->get_time(&h, &m, &s);

    // Zeitkorrektur (+2 Stunden)
    h = (h + 2) % 24;

    // Formatierung: HH:MM:SS
    out[0] = (h / 10) + '0';
    out[1] = (h % 10) + '0';
    out[2] = ':';
    out[3] = (m / 10) + '0';
    out[4] = (m % 10) + '0';
    out[5] = ':';
    out[6] = (s / 10) + '0';
    out[7] = (s % 10) + '0';
    out[8] = '\0';
}

// Vollständige Bildschirmerneuerung
void full_refresh(const SyscallTable* sys) {
    unsigned int* fb = (unsigned int*)sys->fb_ptr;

    // Desktop zeichnen
    draw_desktop(fb, sys->stride, 1024, 768);

    // Startmenü zeichnen (falls offen)
    if (start_menu_open) {
        draw_window(fb, sys->stride, 5, 428, 200, 300, "SYSTEM", 0x00C0C0C0);

        const char* menu[] = {
            "[F1] CONSOLE",
            "[F2] REBOOT",
            "[F3] SHUTDOWN",
            "[E] SETTINGS"
        };

        for (int i = 0; i < 4; i++) {
            unsigned int bg_color = (i == selected_item) ? 0x00000080 : 0x00C0C0C0;
            unsigned int text_color = (i == selected_item) ? 0x00FFFFFF : 0x00000000;

            // Menüeintrag-Hintergrund
            draw_rectangle(fb, sys->stride, 10, 460 + (i * 30), 190, 25, bg_color);

            // Menüeintrag-Text
            draw_string(fb, sys->stride, 15, 465 + (i * 30), (char*)menu[i], text_color);
        }
    }

    // Uhrzeit anzeigen
    char time_str[9];
    get_corrected_time(sys, time_str);
    draw_string(fb, sys->stride, 940, 742, time_str, 0x00000000);
}

// Haupteinstiegspunkt
__attribute__((section(".text.entry")))
void main(const SyscallTable* sys) {
    // Initialisiere GUI
    wm_init(sys);
    full_refresh(sys);

    // Haupt-Event-Schleife
    unsigned short last_second = 99;
    while (1) {
        unsigned short h, m, s;
        sys->get_time(&h, &m, &s);

        // Aktualisiere Bildschirm bei Sekundentick
        if (s != last_second) {
            full_refresh(sys);
            last_second = s;
        }

        // Tastatureingabe verarbeiten
        unsigned short key = sys->get_key();
        if (key != 0) {
            switch (key) {
            case KEY_F5:  // Startmenü toggeln
                start_menu_open = !start_menu_open;
                full_refresh(sys);
                break;

            case KEY_F4:  // Startmenü schließen
                start_menu_open = 0;
                full_refresh(sys);
                break;

            case KEY_F1:  // Console starten
                run(sys, "CONSOLE.BIN");
                full_refresh(sys);
                break;

            case KEY_F2:  // Reboot
                sys->reboot();
                break;

            case KEY_F3:  // Shutdown
                sys->shutdown();
                break;

            case 'e':  // Fallthrough
            case 'E':  // Settings öffnen
                run(sys, "SETTINGS.BIN");
                full_refresh(sys);
                break;

            case KEY_UP:  // Menü-Navigation
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

            case KEY_ENTER:  // Menüauswahl bestätigen
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

        // CPU-Last reduzieren
        for (volatile int i = 0; i < 50; i++);
    }
}