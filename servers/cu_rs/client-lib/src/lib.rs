mod utils;
use crate::utils::set_panic_hook;

#[no_mangle] // Ensures the function is exported
pub extern "C" fn greet() {
    println!("Hello World!");
}