use std::path::PathBuf;

pub fn get_path_as_string(path: PathBuf) -> String {
    path.to_string_lossy().to_string()
}