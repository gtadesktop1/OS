#ifndef DISPLAY_H
#define DISPLAY_H

// display.h inkludiert libos.h bereits – draw_*-Funktionen werden
// von dort deklariert. Hier stehen NUR die Deklarationen die
// NICHT in libos.h sind, damit es keinen Typkonflikt gibt.

#include "libos.h"

#ifdef __cplusplus
extern "C" {
#endif

	// draw_desktop, draw_window, draw_string, draw_rectangle
	// werden aus libos.h übernommen – KEINE Neudeklaration hier!

	void wm_init(const SyscallTable* sys);

#ifdef __cplusplus
}
#endif

#endif // DISPLAY_H