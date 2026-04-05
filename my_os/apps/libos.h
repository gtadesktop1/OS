#ifndef LIBOS_H
#define LIBOS_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

    // Dateisystem-Eintrag (vergrößert für lange Namen)
    typedef struct {
        char name[24];       // Dateiname (max 24 Zeichen, ASCII)
        uint8_t is_dir;      // 1 = Verzeichnis, 0 = Datei
    } FileEntry;

    // Syscall-Tabelle (Immutable nach Initialisierung)
    typedef struct {
        // Framebuffer-Informationen
        void* fb_ptr;        // Roh-Framebuffer-Pointer
        size_t stride;       // Byte pro Bildschirmzeile
        uint32_t width;      // Bildschirmbreite (Pixel)
        uint32_t height;     // Bildschirmhöhe (Pixel)

        // Syscall-Funktionspointer
        uint16_t(*get_key)(void);                  // Tastendruck abfragen
        void (*get_time)(uint16_t* h, uint16_t* m, uint16_t* s);  // Zeit abfragen
        uint32_t(*list_files)(                    // Verzeichnis auflisten
            const char* path,                      // Pfad (UTF-16)
            FileEntry* buffer,                     // Ausgabepuffer
            uint32_t buffer_size,                  // Puffergröße
            uint32_t offset                       // Offset für Pagination
            );
        void (*execute_app)(const uint8_t* path);  // App ausführen (Pfad als UTF-16)
        void (*reboot)(void);                      // Neustart
        void (*shutdown)(void);                    // Herunterfahren
    } SyscallTable;

    // Grafische Primitive (C-Bindings)
    void draw_desktop(uint32_t* fb, size_t stride, int width, int height);
    void draw_window(uint32_t* fb, size_t stride, int x, int y, int w, int h, const char* title, uint32_t color);
    void draw_string(uint32_t* fb, size_t stride, int x, int y, const char* str, uint32_t color);
    void draw_rectangle(uint32_t* fb, size_t stride, int x, int y, int w, int h, uint32_t color);
    void wm_init(const SyscallTable* sys);  // GUI initialisieren

    // Zusätzliche Hilfsfunktionen (unverändert)
    int is_point_in_rect(int px, int py, int rx, int ry, int rw, int rh);
    void draw_mouse(uint32_t* fb, size_t stride, int x, int y, uint32_t color);

#ifdef __cplusplus
}  // extern "C"
#endif

#endif  // LIBOS_H