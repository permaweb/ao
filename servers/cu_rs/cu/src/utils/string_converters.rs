/// converts a comma delimited string into a vec
pub fn get_array(input: String) -> Vec<String> {
    input.split(',').map(|str| str.to_string()).collect::<Vec<String>>()
}