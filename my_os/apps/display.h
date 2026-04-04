#define DISPLAY_H
#define DISPLAY_H

#include "libos.h"

// display.h
#ifdef __cplusplus
extern "C" {
#endif

	void draw_desktop(unsigned int* fb, int stride, int width, int height);
	void draw_window(unsigned int* fb, int stride, int x, int y, int w, int h, const char* title, unsigned int color);
	void draw_string(unsigned int* fb, int stride, int x, int y, const char* str, unsigned int color);
	void draw_rectangle(unsigned int* fb, int stride, int x, int y, int w, int h, unsigned int color);
	void wm_init(const SyscallTable* sys);

#ifdef __cplusplus
}
#endif