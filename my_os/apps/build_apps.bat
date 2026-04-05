@echo off
setlocal enabledelayedexpansion
set "CC=g++"
set "LD=ld"
set "OBJCOPY=objcopy"
set "STRIP=strip"

:: Einfache Flags ohne Windows-spezifische Features
set "CFLAGS=-ffreestanding -fno-exceptions -fno-rtti -nostdlib -fno-asynchronous-unwind-tables -c"
set "LDFLAGS=-T link.ld -e main -nostdlib --gc-sections"

echo [1/3] Kompiliere Shared Components...
%CC% %CFLAGS% display.cpp -o display.o

echo [2/3] Baue Apps lokal

for %%f in (*.cpp) do (
    if /I not "%%f"=="display.cpp" (
        set "APP_NAME=%%~nf"
        echo Baue: !APP_NAME!

        %CC% %CFLAGS% "%%f" -o "!APP_NAME!.o"
        
        if exist "!APP_NAME!.o" (
            %LD% %LDFLAGS% "!APP_NAME!.o" display.o -o "!APP_NAME!.tmp"
            
            if exist "!APP_NAME!.tmp" (
                :: Entferne alle problematischen Sections
                %STRIP% --remove-section=.pdata --remove-section=.xdata --remove-section=.reloc "!APP_NAME!.tmp" 2>nul || echo Strip nicht verfügbar, überspringe...
                
                %OBJCOPY% -O binary "!APP_NAME!.tmp" "!APP_NAME!.BIN"
                echo [OK] !APP_NAME!.BIN erstellt.
                del "!APP_NAME!.tmp"
            )
        )
    )
)

echo [3/3] Aufraeumen der lokalen Bau-Dateien...
del *.o >nul 2>&1

echo ---------------------------------------
echo [FERTIG]