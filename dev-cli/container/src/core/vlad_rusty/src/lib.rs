#[no_mangle]  // Ensures the function name isn't mangled by Rust's name mangling
pub extern "C" fn add_two_integers(a: i32, b: i32) -> i32 {
    a + b
}

#[no_mangle]
pub extern "C" fn subtract_two_integers(a: i32, b: i32) -> i32 {
    a - b
}