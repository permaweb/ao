/// converts a comma delimited string into a vec
pub fn get_array(input: String) -> Vec<String> {
    input.split(',').collect::<Vec<String>>()
}