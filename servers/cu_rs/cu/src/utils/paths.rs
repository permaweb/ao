use std::path::PathBuf;
use std::env::temp_dir;

pub fn get_path_as_string(path: PathBuf) -> String {
    temp_dir().to_string_lossy().to_string()
}