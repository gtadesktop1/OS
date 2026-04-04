#ifndef LIBOS_H
#define LIBOS_H

#ifdef __cplusplus
extern "C" {
#else
#include <stdbool.h>
#endif

typedef struct {
    char name[32];
    unsigned char is_dir; // u8 statt bool
    unsigned int size;
} FileEntry;

typedef struct {
    unsigned int* fb_ptr;
    unsigned int stride;
    void (*get_time)(unsigned short* h, unsigned short* m, unsigned short* s);
    unsigned short (*get_key)();
    void (*reboot)();
    void (*shutdown)();
    void (*execute_app)(const char* path);
    int (*file_write)(const char* path, const unsigned char* data, unsigned int size);
    unsigned int (*list_files)(const char* path, FileEntry* out_ptr, unsigned int max_count);
    bool (*check_permission)(unsigned int level_needed);
    int (*file_read)(const char* path, unsigned char* buffer, unsigned int max_size); // NEU
} SyscallTable;

static inline bool str_equals(const char* a, const char* b) {
    while (*a && (*a == *b)) { a++; b++; }
    return *a == *b;
}

// Hilfsfunktion: Länge eines Strings
static inline unsigned int str_len(const char* s) {
    unsigned int l = 0;
    while (s[l]) l++;
    return l;
}

#ifdef __cplusplus
}
#endif

#endif