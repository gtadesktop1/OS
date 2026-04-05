// Dieser Block muss ganz oben stehen!
#ifdef __cplusplus
extern "C" {
#endif
    void __main() {}
    void _alloca() {} // Manche MinGW-Versionen wollen auch das
#ifdef __cplusplus
}
#endif

#include "libos.h"
#include "display.h"

void main(const SyscallTable* sys) {
    // 1. Berechtigung prüfen
    bool is_admin = sys->check_permission(0); // 0 = Root/Admin

    draw_window(sys->fb_ptr, sys->stride, 50, 50, 700, 500, "FILE EXPLORER", 0x00004080);

    if (!is_admin) {
        draw_string(sys->fb_ptr, sys->stride, 70, 80, "MODE: READ-ONLY (USER)", 0x00FF0000);
    }
    else {
        draw_string(sys->fb_ptr, sys->stride, 70, 80, "MODE: FULL ACCESS (ADMIN)", 0x0000FF00);
    }

    // 2. Dateibaum zeichnen (Simuliert bis list_files fertig ist)
    const char* path = "APPS/";
    draw_string(sys->fb_ptr, sys->stride, 70, 120, "Directory: APPS/", 0x00FFFFFF);

    // Trennlinie
    draw_rectangle(sys->fb_ptr, sys->stride, 70, 140, 660, 2, 0x00FFFFFF);

    // Dummy-Liste der Dateien
    const char* files[] = { "MANAGER.BIN", "COMPILER.BIN", "SETTINGS.BIN", "SYSTEM.SYS" };
    for (int i = 0; i < 4; i++) {
        unsigned int color = 0x00FFFFFF;
        // Sperre: Systemdateien für User rot markieren
        if (!is_admin && str_equals(files[i], "SYSTEM.SYS")) {
            color = 0x00808080; // Ausgegraut
            draw_string(sys->fb_ptr, sys->stride, 80, 160 + (i * 30), "[LOCKED]", color);
        }
        else {
            draw_string(sys->fb_ptr, sys->stride, 80, 160 + (i * 30), "[BIN]", color);
        }
        draw_string(sys->fb_ptr, sys->stride, 160, 160 + (i * 30), files[i], color);
    }

    // 3. Interaktion
    while (1) {
        unsigned short k = sys->get_key();
        if (k == 0x1B) break; // ESC Beenden

        if (k == 'd' || k == 'D') { // Löschen versuchen
            if (!sys->check_permission(0)) {
                draw_window(sys->fb_ptr, sys->stride, 200, 200, 300, 100, "ERROR", 0x00FF0000);
                draw_string(sys->fb_ptr, sys->stride, 210, 240, "PERMISSION DENIED!", 0x00FFFFFF);
            }
        }
    }
    return;
}