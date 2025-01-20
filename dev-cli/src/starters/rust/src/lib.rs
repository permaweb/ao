#![no_std]
#[macro_use]
extern crate alloc;
use alloc::string::String;
use alloc::string::ToString;
pub mod libao;
use alloc::ffi::CString;
use core::ffi::c_char;
use core::ffi::CStr;
use dlmalloc::GlobalDlmalloc;

// #[global_allocator]
// static GLOBAL: GlobalDlmalloc = GlobalDlmalloc;

// /// halt the thread on panic; messages are discarded:
// #[cfg(not(test))]
// #[panic_handler]
// fn panic(_info: &core::panic::PanicInfo) -> ! {
//     loop {}
// }

/// Processes the input `msg` and `env` strings, performs some operations,
/// and returns the result as a C-compatible string.
///
/// # Safety
/// - The caller must ensure that the `msg` and `env` pointers are valid, null-terminated C strings.
/// - The caller is responsible for freeing the returned string using `free_c_string`.
///
/// # Arguments
/// - `msg`: A pointer to a null-terminated C string representing the message.
/// - `env`: A pointer to a null-terminated C string representing the environment.
///
/// # Returns
/// - A pointer to a null-terminated C string containing the result. The caller must not modify
///   or attempt to free this pointer.
#[no_mangle]
pub unsafe extern "C" fn process_handle(msg: *const c_char, env: *const c_char) -> *const c_char {
    // Convert the C strings to Rust strings
    let mut ao = libao::AO::new();
    let msg = unsafe { CStr::from_ptr(msg).to_str().unwrap_or("Invalid msg") };
    let env = unsafe { CStr::from_ptr(env).to_str().unwrap_or("Invalid env") };

    // Call the Rust handler function to process the inputs
    match handler(&mut ao, msg, env) {
        Ok(ret) => {
            let c_response = CString::new(ret).unwrap();
            c_response.into_raw()
        }
        Err(_) => {
            let c_response = CString::new("Internal Error").unwrap();
            c_response.into_raw()
        }
    }

    // Convert the Rust string result into a CString

    // Return the raw pointer to the C-compatible string
    // The caller is now responsible for freeing this memory
}

pub fn handler(ao: &mut libao::AO, msg: &str, env: &str) -> Result<String, libao::Error> {
    let _ = ao.init(env)?;
    ao.log("Normalize");
    let norm = ao.normalize(msg)?;
    ao.log(msg);
    let _send = &ao.send(&norm)?;
    Ok("{\"ok\": true,\"response\":{\"Output\":\"Success\"},\"Memory\":50000000}".to_string())
}

#[cfg(test)]
mod tests {

    use super::*;

    #[test]
    fn test_process_handle() {
        let msg_json = r#"{"key": "value"}"#;
        let env_json = r#"{"env": "test"}"#;

        let c_msg = CString::new(msg_json).expect("Failed to create CString for msg");
        let c_env = CString::new(env_json).expect("Failed to create CString for env");
        let c_result = unsafe { process_handle(c_msg.as_ptr(), c_env.as_ptr()) };

        assert!(!c_result.is_null(), "Returned pointer is null");

        let result_str = unsafe { CStr::from_ptr(c_result).to_string_lossy().into_owned() };

        let expected_result = r#"{"ok": true,"response":{"Output":"Success"},"Memory":50000000}"#;
        assert_eq!(
            result_str, expected_result,
            "Output does not match expected result"
        );
    }
}
