@echo off
setlocal enabledelayedexpansion
set "CC=g++"
set "LD=ld"
set "OBJCOPY=objcopy"

:: Lokaler Ausgabeordner im apps-Verzeichnis

set "CFLAGS=-ffreestanding -fno-exceptions -fno-rtti -nostdlib -mno-red-zone -fno-stack-protector -mno-stack-arg-probe -fno-ident -c"
set "LDFLAGS=-T app.ld --image-base 0x1000000 -e main -nostdlib"

:: Erstelle lokalen dist-Ordner, falls nicht da

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
                :: Hier schreiben wir jetzt in den lokalen dist-Ordner
                %OBJCOPY% -O binary "!APP_NAME!.tmp" "!APP_NAME!.BIN"
                echo [OK] !APP_NAME!.BIN erstellt.
            )
        )
    )
)

echo [3/3] Aufraeumen der lokalen Bau-Dateien...
del *.o >nul 2>&1
if exist *.tmp del *.tmp >nul 2>&1

echo ---------------------------------------
echo [FERTIG]