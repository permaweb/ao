

use diesel::pg::PgConnection;
use diesel::prelude::*;
use diesel::r2d2::ConnectionManager;
use diesel::r2d2::Pool;
use dotenv::dotenv;
use std::env;
use std::env::VarError;

use super::super::core::json::{Message, Process};

#[derive(Debug)]
pub enum StoreErrorType {
    DatabaseError(String),
    NotFound(String),
    JsonError(String),
    EnvVarError(String)
}

use diesel::result::Error as DieselError; // Import Diesel's Error

impl From<DieselError> for StoreErrorType {
    fn from(diesel_error: DieselError) -> Self {
        StoreErrorType::DatabaseError(format!("{:?}", diesel_error))
    }
}

impl From<serde_json::Error> for StoreErrorType {
    fn from(error: serde_json::Error) -> Self {
        StoreErrorType::JsonError(format!("data store json error: {}", error))
    }
}

impl From<StoreErrorType> for String {
    fn from(error: StoreErrorType) -> Self {
        format!("{:?}", error)
    }
}

impl From<VarError> for StoreErrorType {
    fn from(error: VarError) -> Self{
        StoreErrorType::EnvVarError(format!("data store env var error: {}", error))
    }
}

impl From<diesel::prelude::ConnectionError> for StoreErrorType {
    fn from(error: diesel::prelude::ConnectionError) -> Self{
        StoreErrorType::DatabaseError(format!("data store connection error: {}", error))
    }
}


pub struct StoreClient{
    pool: Pool<ConnectionManager<PgConnection>>
}

impl StoreClient {
    pub fn new() -> Result<Self, StoreErrorType> {
        dotenv().ok();
        let database_url = env::var("DATABASE_URL")?;
        let manager = ConnectionManager::<PgConnection>::new(database_url);
        let pool = Pool::builder()
            .test_on_check_out(true)
            .build(manager).map_err(
                |_| StoreErrorType::DatabaseError("Failed to initialize connection pool.".to_string())
            )?;

        Ok(StoreClient { pool })
    }

    pub fn get_conn(&self) -> Result<diesel::r2d2::PooledConnection<ConnectionManager<PgConnection>>, StoreErrorType> {
        self.pool.get().map_err(
            |_| StoreErrorType::DatabaseError("Failed to get connection from pool.".to_string())
        )
    }

    pub fn save_process(&self, process: &Process) -> Result<String, StoreErrorType> {
        use super::schema::processes::dsl::*;
        let conn = &mut self.get_conn()?;
    
        let new_process = NewProcess {
            process_id: &process.process_id,
            process_data: serde_json::to_value(process).expect("Failed to serialize Process"),
        };
    
        match diesel::insert_into(processes)
            .values(&new_process)
            .on_conflict(process_id)
            .do_nothing() 
            .execute(conn)
        {
            Ok(_) => {
                Ok("saved".to_string())
            },
            Err(e) => Err(StoreErrorType::from(e)),
        }
    }

    pub fn get_process(&self, process_id_in: &str) -> Result<Process, StoreErrorType> {
        use super::schema::processes::dsl::*;
        let conn = &mut self.get_conn()?;
    
        let db_process_result: Result<Option<DbProcess>, DieselError> = processes
            .filter(process_id.eq(process_id_in))
            .first(conn)
            .optional();
    
        match db_process_result {
            Ok(Some(db_process)) => {
                let process: Process = serde_json::from_value(db_process.process_data.clone())?;
                Ok(process)
            },
            Ok(None) => Err(StoreErrorType::NotFound("Process not found".to_string())), 
            Err(e) => Err(StoreErrorType::from(e)),
        }
    }
    
    pub fn save_message(&self, message: &Message) -> Result<String, StoreErrorType> {
        use super::schema::messages::dsl::*;
        let conn = &mut self.get_conn()?;
    
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
                    Err(StoreErrorType::DatabaseError("Duplicate message id".to_string())) // Return a custom error for duplicates
                } else {
                    Ok("saved".to_string())
                }
            },
            Err(e) => Err(StoreErrorType::from(e)),
        }
    }    


    pub fn get_messages(&self, process_id_in: &str) -> Result<Vec<Message>, StoreErrorType> {
        use super::schema::messages::dsl::*;
        let conn = &mut self.get_conn()?;

        let db_messages_result: Result<Vec<DbMessage>, DieselError> = messages
            .filter(process_id.eq(process_id_in))
            .load(conn);

        match db_messages_result {
            Ok(db_messages) => {
                let n_messages: Result<Vec<Message>, StoreErrorType> = db_messages
                    .iter()
                    .map(|db_message| {
                        serde_json::from_value(db_message.message_data.clone())
                            .map_err(|e| StoreErrorType::from(e))
                    })
                    .collect();
        
                n_messages
            }
            Err(e) => Err(StoreErrorType::from(e)),
        }
    }

    pub fn get_message(&self, message_id_in: &str) -> Result<Message, StoreErrorType> {
        use super::schema::messages::dsl::*;
        let conn = &mut self.get_conn()?;
    
        let db_message_result: Result<Option<DbMessage>, DieselError> = messages
            .filter(message_id.eq(message_id_in))
            .first(conn)
            .optional();
    
        match db_message_result {
            Ok(Some(db_message)) => {
                let message: Message = serde_json::from_value(db_message.message_data.clone())?;
                Ok(message)
            },
            Ok(None) => Err(StoreErrorType::NotFound("Message not found".to_string())), // Adjust this error type as needed
            Err(e) => Err(StoreErrorType::from(e)),
        }
    }
    
}


#[derive(Queryable, Selectable)]
#[diesel(table_name = super::schema::processes)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct DbProcess {
    pub row_id: i32,
    pub process_id: String,
    pub process_data: serde_json:: Value,
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
    pub process_data: serde_json::Value,
}


