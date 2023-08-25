#[doc(hidden)]
mod detail;
pub mod handler_result;
#[doc(hidden)]
pub mod methods;
#[doc(hidden)]
pub mod optional_cell;
#[doc(hidden)]
pub mod warp_result;

#[no_mangle]
pub static __WARP_CONTRACTS_VERSION_1: usize = 0x000001002;
