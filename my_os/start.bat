@echo off
setlocal enabledelayedexpansion

:: Den aktuellen Ordner absolut festlegen
set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"

pushd "%BASE_DIR%"

echo [1/3] Kompiliere Kernel...
cargo build --target x86_64-unknown-uefi
if %errorlevel% neq 0 (
    echo [FEHLER] Kernel-Kompilierung fehlgeschlagen!
    pause
    exit /b %errorlevel%
)

echo [1.5/3] Baue MANAGER.BIN neu...
if exist "apps\build_app.bat" (
    pushd "apps"
    :: WICHTIG: call verwenden, damit das Skript zurückkehrt!
    call build_app.bat
    popd
) else (
    echo [WARNUNG] apps\build_app.bat nicht gefunden!
)
if exist "apps\build_apps.bat" (
    pushd "apps"
    :: WICHTIG: call verwenden, damit das Skript zurückkehrt!
    call build_apps.bat
    popd
) else (
    echo [WARNUNG] apps\build_apps.bat nicht gefunden!
)

echo [2/3] Erstelle Boot-Struktur...
:: Ordner nur löschen, wenn er existiert, um Fehler zu vermeiden
if exist esp rd /s /q esp
mkdir esp\EFI\BOOT
:: Der Kernel sucht laut Rust-Code in APPS\ (Großbuchstaben)
mkdir esp\APPS

if exist "target\x86_64-unknown-uefi\debug\my_os.efi" (
    copy /y "target\x86_64-unknown-uefi\debug\my_os.efi" "esp\EFI\BOOT\BOOTX64.EFI"
) else (
    echo [FEHLER] my_os.efi wurde nicht gefunden!
    pause
    exit /b 1
)

:: Kopiere die MANAGER.BIN explizit in den richtigen Ordner
echo Kopiere alle App-Binaries in das Image...
set "FOUND=0"

for %%f in (apps\*.BIN) do (
    copy /y "%%f" "esp\APPS\" >nul
    echo  [+] %%~nxf kopiert.
    set "FOUND=1"
)

if %FOUND%==0 (
    echo [FEHLER] Keine .BIN Dateien in \apps gefunden!
    pause
)

echo [3/3] Starte QEMU...

:: 1. Sicherstellen, dass wir im richtigen Verzeichnis sind
set "WORKING_DIR=%~dp0"

:: 2. Pfad zur ovmf.fd sauber setzen
if exist "%WORKING_DIR%ovmf.fd" (
    echo [INFO] Gefunden: %WORKING_DIR%ovmf.fd
    :: Wir übergeben den Ordner als Library-Pfad (-L) und die Datei direkt
    set QEMU_BIOS=-bios "ovmf.fd"
) else (
    echo [WARNUNG] ovmf.fd nicht gefunden. Nutze Standard-BIOS.
    set QEMU_BIOS=
)

:: 3. QEMU Aufruf ohne Zeilenumbrüche (verhindert Parsing-Fehler)
:: Wir nutzen -L . damit QEMU im aktuellen Verzeichnis nach der ovmf.fd sucht
qemu-system-x86_64 -L . %QEMU_BIOS% -net none -drive "file=fat:rw:esp,format=raw,media=disk" -m 256M -usb -device usb-mouse -serial stdio -pflash "ovmf.fd"

if %errorlevel% neq 0 (
    echo.
    echo [FEHLER] QEMU konnte nicht gestartet werden. 
    echo Pfad war: "%WORKING_DIR%ovmf.fd"
)

pause

popd
echo Der Prozess wurde beendet.
pause