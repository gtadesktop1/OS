@echo off
echo [NTFS-OS] Initializing Project...

:: Check for Rust
where rustc >nul 2>nul
if %errorlevel% neq 0 (
    echo [Error] Rust is not installed. Please install it from https://rustup.rs/
    exit /b 1
)

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [Error] Node.js is not installed. Please install it from https://nodejs.org/
    exit /b 1
)

:: Check for QEMU
where qemu-system-x86_64 >nul 2>nul
if %errorlevel% neq 0 (
    echo [Warning] QEMU is not installed. You will not be able to run the kernel.
)

echo [NTFS-OS] Configuring Rust Nightly...
rustup toolchain install nightly
rustup component add rust-src --toolchain nightly
rustup component add llvm-tools-preview --toolchain nightly
cargo install bootimage

echo [NTFS-OS] Installing Frontend Dependencies...
npm install

echo [NTFS-OS] Building Frontend...
npm run build

echo [NTFS-OS] Building Rust Kernel...
cd rust
cargo build --release
cd ..

echo [NTFS-OS] Project Initialized Successfully!
echo To run the simulation: npm run dev
echo To run the bare-metal kernel (requires QEMU): qemu-system-x86_64 -drive format=raw,file=rust/target/x86_64-ntfs_os/release/bootimage-ntfs-os-kernel.bin
pause
