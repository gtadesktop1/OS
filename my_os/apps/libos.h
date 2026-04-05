#ifndef LIBOS_H
#define LIBOS_H

#ifdef __cplusplus
extern "C" {
#else
#include <stdbool.h>
#endif

typedef struct {
    char name[32];
    unsigned char is_dir;
    unsigned int size;
} FileEntry;

typedef struct {
    unsigned int* fb_ptr;
    unsigned int  stride;   // FIX: war size_t – muss unsigned int sein (passt zu display.cpp)
    void (*get_time)(unsigned short* h, unsigned short* m, unsigned short* s);
    unsigned short (*get_key)(void);
    void (*reboot)(void);
    void (*shutdown)(void);
    void (*execute_app)(const unsigned char* path);
    int  (*file_write)(const unsigned char* path, const unsigned char* data, unsigned int size);
    unsigned int (*list_files)(const char* path, FileEntry* out_ptr, unsigned int max_count);
    bool (*check_permission)(unsigned int level_needed);
    int  (*file_read)(const char* path, unsigned char* buffer, unsigned int max_size);
} SyscallTable;

// Draw-Funktionen: Typen MÜSSEN exakt zu display.cpp passen
// FIX: war uint32_t* / size_t – jetzt unsigned int* / int (wie display.cpp implementiert)
void draw_desktop(unsigned int* fb, int stride, int width, int height);
void draw_window(unsigned int* fb, int stride, int x, int y, int w, int h, const char* title, unsigned int color);
void draw_string(unsigned int* fb, int stride, int x, int y, const char* str, unsigned int color);
void draw_rectangle(unsigned int* fb, int stride, int x, int y, int w, int h, unsigned int color);
void wm_init(const SyscallTable* sys);

// Hilfsfunktionen
static inline bool str_equals(const char* a, const char* b) {
    while (*a && (*a == *b)) { a++; b++; }
    return *a == *b;
}

static inline unsigned int str_len(const char* s) {
    unsigned int l = 0;
    while (s[l]) l++;
    return l;
}

#ifdef __cplusplus
}
#endif

#endif // LIBOS_H