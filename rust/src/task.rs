pub mod executor {
    pub struct Executor;
    impl Executor {
        pub fn new() -> Self { Executor }
        pub fn run(&mut self) -> ! { loop {} }
    }
}
