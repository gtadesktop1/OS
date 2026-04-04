fn main() {
    cc::Build::new()
        .cpp(true)
        .file("display.cpp")
        .include("apps")
        .include(".")
        .flag("-ffreestanding")
        .flag("-fno-exceptions")
        .flag("-fno-rtti")
        .flag("-fno-threadsafe-statics") // Wichtig für Bare-Metal
        .cpp_set_stdlib(None)            // <--- DAS HIER verhindert die Suche nach stdc++.lib
        .compile("display");

    println!("cargo:rerun-if-changed=display.cpp");
}