use alloc::string::String;
use alloc::string::ToString;
use alloc::vec::Vec;
use serde_json::{json, Map, Value};

pub enum Error {
    SerdeError(serde_json::Error),
    FailedToGetAuthorities,
    FailedToGetTag,
    FailedToGetMessageInOutbox,
    FailedToGetArrayAsMut,
}

impl From<serde_json::Error> for Error {
    fn from(err: serde_json::Error) -> Error {
        Error::SerdeError(err)
    }
}

pub struct AO {
    pub version: String,
    module: Option<String>,
    id: Option<String>,
    authorities: Option<Vec<String>>,
    outbox: Value,
    ref_count: usize,
}

impl AO {
    pub fn new() -> AO {
        AO {
            version: "0.0.4".to_string(),
            module: None,
            id: None,
            authorities: None,
            outbox: json!({
                "Output": [],
                "Messages": [],
                "Spawns": [],
                "Assignments": [],
                "Error": null
            }),
            ref_count: 0,
        }
    }

    pub fn init(&mut self, env: &str) -> Result<(), Error> {
        // Parse the environment JSON string into a Value (serde_json's equivalent of cJSON)
        let env_json: Value = serde_json::from_str(env)?;

        // Retrieve the "Process" object from the parsed JSON
        if let Some(process) = env_json.get("Process") {
            // If id is None, retrieve it from the "Process" object
            if self.id.is_none() {
                self.id = process
                    .get("Id")
                    .and_then(Value::as_str)
                    .map(str::to_string);
            }

            // Retrieve the "Tags" array from the "Process" object
            if let Some(tags) = process.get("Tags").and_then(Value::as_array) {
                // Search for the "Module" tag within "Tags"
                if self.module.is_none() {
                    for tag in tags {
                        if let Some(name) = tag.get("name").and_then(Value::as_str) {
                            if name == "Module" {
                                self.module =
                                    tag.get("value").and_then(Value::as_str).map(str::to_string);
                                break;
                            }
                        }
                    }
                }

                // Initialize authorities as an empty vector if it's None
                if self.authorities.is_none() {
                    self.authorities = Some(Vec::new());
                    for tag in tags {
                        if let Some(name) = tag.get("name").and_then(Value::as_str) {
                            if name == "Authority" {
                                if let Some(value) = tag.get("value").and_then(Value::as_str) {
                                    self.authorities
                                        .as_mut()
                                        .ok_or(Error::FailedToGetAuthorities)?
                                        .push(value.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }
        self.clear_outbox();
        Ok(())
    }

    pub fn normalize(&self, msg: &str) -> Result<String, Error> {
        let msg_json: Value = serde_json::from_str(msg)?;
        Ok(serde_json::to_string(&msg_json)?)
    }

    pub fn sanitize(&self, msg: &str) -> Result<String, Error> {
        let mut msg_json: Value = serde_json::from_str(msg)?;
        let mut new_message = Map::new();

        // Iterate over each key in the JSON object, excluding non-forwardable tags
        for (key, value) in msg_json.as_object_mut().unwrap().iter_mut() {
            if !self.is_string_in_array(key, &self.non_forwardable_tags()) {
                new_message.insert(key.clone(), value.clone());
            }
        }
        Ok(serde_json::to_string(&new_message)?)
    }

    pub fn log(&mut self, msg: &str) {
        let output = self.outbox.get_mut("Output").unwrap();
        if let Some(arr) = output.as_array_mut() {
            arr.push(Value::String(msg.to_string()));
        }
    }

    pub fn send(&mut self, msg: &str) -> Result<String, Error> {
        let msg_json: Value = serde_json::from_str(msg)?;
        self.ref_count += 1;
        let padded_ref = format!("{:032}", self.ref_count);

        let mut message = Map::new();
        self.add_string_to_json_if_exists(&msg_json, &mut message, "Target");
        self.add_string_to_json_if_exists(&msg_json, &mut message, "Data");
        self.add_string_to_json_if_exists(&msg_json, &mut message, "Anchor");
        let default = vec![];
        let tags = msg_json
            .get("Tags")
            .and_then(Value::as_array)
            .unwrap_or(&default);
        let mut tags_array = Vec::new();
        self.add_tag_to_array(&mut tags_array, "Data-Protocol", "ao");
        self.add_tag_to_array(&mut tags_array, "Variant", "aoc.TN.1");
        self.add_tag_to_array(&mut tags_array, "Type", "Message");
        self.add_tag_to_array(&mut tags_array, "Reference", &padded_ref);

        for tag in tags {
            if let Some(name) = tag.get("name").and_then(Value::as_str) {
                if !self.is_string_in_array(name, &self.persistent_tags()) {
                    self.add_tag_to_array(
                        &mut tags_array,
                        name,
                        tag.get("value")
                            .and_then(Value::as_str)
                            .ok_or(Error::FailedToGetTag)?,
                    );
                }
            }
        }

        message.insert("Tags".to_string(), Value::Array(tags_array));

        let messages = self
            .outbox
            .get_mut("Messages")
            .ok_or(Error::FailedToGetMessageInOutbox)?
            .as_array_mut()
            .ok_or(Error::FailedToGetArrayAsMut)?;
        messages.push(Value::Object(message.clone()));

        Ok(serde_json::to_string(&message)?)
    }

    pub fn assign(&mut self, assignment: &str) -> Result<(), Error> {
        let assignment_json: Value = serde_json::from_str(assignment)?;
        let assignments = self
            .outbox
            .get_mut("Assignments")
            .unwrap()
            .as_array_mut()
            .unwrap();
        assignments.push(assignment_json);
        Ok(())
    }

    pub fn is_trusted(&self, msg: &str) -> bool {
        let msg_json: Value = serde_json::from_str(msg).unwrap();

        if let Some(authorities) = &self.authorities {
            for authority in authorities {
                if let Some(from) = msg_json.get("From").and_then(Value::as_str) {
                    if from == authority {
                        return true;
                    }
                }

                if let Some(owner) = msg_json.get("Owner").and_then(Value::as_str) {
                    if owner == authority {
                        return true;
                    }
                }
            }
            false
        } else {
            true
        }
    }

    pub fn result(&self, result: &str) -> String {
        let result_json: Value = serde_json::from_str(result).unwrap();
        if let Some(error) = result_json.get("Error") {
            if !error.is_null() {
                return serde_json::to_string(&error).unwrap();
            }
        }

        let output = result_json.get("Output").unwrap_or(&self.outbox["Output"]);
        let mut result_out = Map::new();
        result_out.insert("Output".to_string(), output.clone());

        serde_json::to_string(&result_out).unwrap()
    }

    pub fn clear_outbox(&mut self) {
        self.outbox = json!({
            "Output": [],
            "Messages": [],
            "Spawns": [],
            "Assignments": [],
            "Error": null
        });
    }

    pub fn add_tag_to_array(&self, tags_array: &mut Vec<Value>, name: &str, value: &str) {
        tags_array.push(json!({ "name": name, "value": value }));
    }

    pub fn is_string_in_array(&self, s: &str, array: &[&str]) -> bool {
        array.contains(&s)
    }

    pub fn non_forwardable_tags(&self) -> Vec<&str> {
        vec![
            "Data-Protocol",
            "Variant",
            "From-Process",
            "From-Module",
            "Type",
            "From",
            "Owner",
            "Anchor",
            "Target",
            "Tags",
        ]
    }

    pub fn persistent_tags(&self) -> Vec<&str> {
        vec!["Target", "Data", "Anchor", "Tags", "From"]
    }

    pub fn add_string_to_json_if_exists(
        &self,
        msg_json: &Value,
        message: &mut Map<String, Value>,
        key: &str,
    ) {
        if let Some(val) = msg_json.get(key) {
            message.insert(key.to_string(), val.clone());
        }
    }
}
