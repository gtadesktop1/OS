@echo off
:: Navigiere zum Ordner der Batch-Datei
cd /d %~dp0

echo --- PRÜFUNG: Dateien ---
if exist edk2-x86_64-code.fd (echo [OK] Firmware gefunden) else (echo [FEHLER] edk2-x86_64-code.fd fehlt!)

echo --- PRÜFUNG: Cargo ---
call cargo --version
if %errorlevel% neq 0 echo [FEHLER] Cargo nicht im PATH!

echo --- PRÜFUNG: QEMU ---
where qemu-system-x86_64
if %errorlevel% neq 0 echo [FEHLER] QEMU nicht im PATH!

echo --- STARTE BUILD ---
cargo build --target x86_64-unknown-uefi
if %errorlevel% neq 0 (
    echo [FEHLER] Build fehlgeschlagen!
    cmd /k
)

echo --- STARTE QEMU ---
:: Ich habe die Zeilenumbrüche (^) entfernt, um Fehlerquellen zu minimieren
qemu-system-x86_64 -drive if=pflash,format=raw,readonly=on,file=edk2-x86_64-code.fd -net none -drive format=raw,file=fat:rw:esp -m 256M -serial stdio

echo --- ENDE ---
pause
cmd /k