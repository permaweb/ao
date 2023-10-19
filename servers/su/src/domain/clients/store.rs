

use diesel::pg::PgConnection;
use diesel::prelude::*;
use dotenv::dotenv;
use std::env;

use super::super::bl::results::{DepError, TransactionId};
use super::super::core::json::{Message, Process};

pub struct StoreClient{
    connection: PgConnection
}

impl StoreClient {
    pub fn connect() -> StoreClient {
        dotenv().ok();
    
        let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

        let connection = PgConnection::establish(&database_url)
            .unwrap_or_else(|_| panic!("Error connecting to {}", database_url));

        StoreClient {
            connection: connection
        }
    }

    pub fn save_process(&mut self, process: Process) -> Result<TransactionId, DepError> {
        use super::schema::processes::dsl::*;
        let conn = &mut self.connection;
    
        let new_process = NewProcess {
            process_id: &process.process_id,
        };
    
        match diesel::insert_into(processes)
            .values(&new_process)
            .on_conflict(process_id)
            .do_nothing() 
            .execute(conn)
        {
            Ok(_) => {
                Ok(TransactionId(9080))
            },
            Err(e) => Err(DepError::from(e)),
        }
    }
    
    pub fn save_message(&mut self, message: &Message) -> Result<TransactionId, DepError> {
        use super::schema::messages::dsl::*;
        let conn = &mut self.connection;
    
        let new_message = NewMessage {
            process_id: &message.process_id,
            message_id: &message.message.id,
            sort_key: &message.sort_key,
            message_data: serde_json::to_value(message).expect("Failed to serialize Message"),
        };
    
        match diesel::insert_into(messages)
            .values(&new_message)
            .on_conflict(message_id)
            .do_nothing() 
            .execute(conn)
        {
            Ok(row_count) => {
                if row_count == 0 {
                    Err(DepError::DatabaseError("Duplicate message id".to_string())) // Return a custom error for duplicates
                } else {
                    Ok(TransactionId(9080))
                }
            },
            Err(e) => Err(DepError::from(e)),
        }
    }    


    pub fn get_messages(&mut self, process_id_in: &str) -> Result<Vec<Message>, DepError> {
        use super::schema::messages::dsl::*;
        let conn = &mut self.connection;

        let db_messages_result: Result<Vec<DbMessage>, DieselError> = messages
            .filter(process_id.eq(process_id_in))
            .load(conn);

        match db_messages_result {
            Ok(db_messages) => {
                let n_messages: Vec<Message> = db_messages
                    .iter()
                    .map(|db_message| {
                        serde_json::from_value(db_message.message_data.clone()).unwrap()
                    })
                    .collect();
                Ok(n_messages)
            },
            Err(e) => Err(DepError::from(e)),
        }
    }

    pub fn get_message(&mut self, message_id_in: &str) -> Result<Message, DepError> {
        use super::schema::messages::dsl::*;
        let conn = &mut self.connection;
    
        let db_message_result: Result<Option<DbMessage>, DieselError> = messages
            .filter(message_id.eq(message_id_in))
            .first(conn)
            .optional();
    
        match db_message_result {
            Ok(Some(db_message)) => {
                let message: Message = serde_json::from_value(db_message.message_data.clone())?;
                Ok(message)
            },
            Ok(None) => Err(DepError::NotFound("Message not found".to_string())), // Adjust this error type as needed
            Err(e) => Err(DepError::from(e)),
        }
    }
    
}

use diesel::result::Error as DieselError; // Import Diesel's Error

impl From<DieselError> for DepError {
    fn from(diesel_error: DieselError) -> Self {
        let e = format!("{:?}", diesel_error);
        println!("{}", e);
        DepError::DatabaseError(e)
    }
}

impl From<serde_json::Error> for DepError {
    fn from(error: serde_json::Error) -> Self {
        // You can create a custom error variant here if needed
        DepError::JsonError(format!("JSON error: {}", error))
    }
}


#[derive(Queryable, Selectable)]
#[diesel(table_name = super::schema::processes)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct DbProcess {
    pub row_id: i32,
    pub process_id: String,
}

#[derive(Queryable, Selectable)]
#[diesel(table_name = super::schema::messages)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct DbMessage {
    pub row_id: i32,
    pub process_id: String,
    pub message_id: String,
    pub sort_key: String,
    pub message_data: serde_json::Value,
}


#[derive(Insertable)]
#[diesel(table_name = super::schema::messages)]
pub struct NewMessage<'a> {
    pub process_id: &'a str,
    pub message_id: &'a str,
    pub sort_key: &'a str,
    pub message_data: serde_json::Value,
}


#[derive(Insertable)]
#[diesel(table_name = super::schema::processes)]
pub struct NewProcess<'a> {
    pub process_id: &'a str,
}


