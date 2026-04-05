@echo off
set CC=gcc
set CXX=g++
set LD=ld
set OBJCOPY=objcopy

echo [1/3] Kompiliere Komponenten...
:: Wir fügen -fno-asynchronous-unwind-tables hinzu, um .pdata Fehler zu vermeiden
%CC% -c manager.c -o manager.o -ffreestanding -fno-stack-protector -mno-red-zone -fno-pic -fno-asynchronous-unwind-tables -O2

%CXX% -c display.cpp -o display.o -ffreestanding -fno-exceptions -fno-rtti -fno-stack-protector -mno-red-zone -fno-pic -fno-asynchronous-unwind-tables -O2

echo [2/3] Linke zu temporärer Datei...
:: Wir werfen alle Windows-spezifischen Sektionen im Linker weg
%LD% -T link.ld -o manager.tmp manager.o display.o -nostdlib

if %errorlevel% neq 0 (
    echo [FEHLER] Linker-Vorgang fehlgeschlagen!
    pause
    exit /b %errorlevel%
)

echo [3/3] Erstelle flaches Binary mit objcopy...
%OBJCOPY% -S -O binary manager.tmp MANAGER.BIN

if exist MANAGER.BIN (
    if not exist "..\esp\APPS" mkdir "..\esp\APPS"
    copy /y MANAGER.BIN "..\esp\APPS\MANAGER.BIN"
    echo [OK] MANAGER.BIN erstellt.
    dir MANAGER.BIN | find "Byte"
) else (
    echo [FEHLER] MANAGER.BIN konnte nicht erstellt werden!
)
pause