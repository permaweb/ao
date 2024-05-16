use std::env::VarError;

use diesel::pg::PgConnection;
use diesel::prelude::*;
use diesel::r2d2::ConnectionManager;
use diesel::r2d2::Pool;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};

use super::super::core::dal::{
    DataStore, JsonErrorType, Message, PaginatedMessages, Process, ProcessScheduler, Scheduler,
    StoreErrorType,
};
use crate::domain::config::AoConfig;

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("./migrations");

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

impl From<JsonErrorType> for StoreErrorType {
    fn from(error: JsonErrorType) -> Self {
        StoreErrorType::JsonError(format!("data store json error: {:?}", error))
    }
}

impl From<StoreErrorType> for String {
    fn from(error: StoreErrorType) -> Self {
        format!("{:?}", error)
    }
}

impl From<VarError> for StoreErrorType {
    fn from(error: VarError) -> Self {
        StoreErrorType::EnvVarError(format!("data store env var error: {}", error))
    }
}

impl From<diesel::prelude::ConnectionError> for StoreErrorType {
    fn from(error: diesel::prelude::ConnectionError) -> Self {
        StoreErrorType::DatabaseError(format!("data store connection error: {}", error))
    }
}

impl From<std::num::ParseIntError> for StoreErrorType {
    fn from(error: std::num::ParseIntError) -> Self {
        StoreErrorType::IntError(format!("data store int error: {}", error))
    }
}

pub struct StoreClient {
    pool: Pool<ConnectionManager<PgConnection>>,
    read_pool: Pool<ConnectionManager<PgConnection>>,
}

impl StoreClient {
    pub fn new() -> Result<Self, StoreErrorType> {
        let config = AoConfig::new(Some("su".to_string())).expect("Failed to read configuration");
        let database_url = config.database_url;
        let database_read_url = match config.database_read_url {
            Some(u) => u,
            None => database_url.clone()
        };
        let manager = ConnectionManager::<PgConnection>::new(database_url);
        let read_manager = ConnectionManager::<PgConnection>::new(database_read_url);
        let pool = Pool::builder()
            .test_on_check_out(true)
            .build(manager)
            .map_err(|_| {
                StoreErrorType::DatabaseError("Failed to initialize connection pool.".to_string())
            })?;

        let read_pool = Pool::builder()
            .test_on_check_out(true)
            .build(read_manager)
            .map_err(|_| {
                StoreErrorType::DatabaseError("Failed to initialize read connection pool.".to_string())
            })?;
        

        Ok(StoreClient { pool, read_pool })
    }

    pub fn get_conn(
        &self,
    ) -> Result<diesel::r2d2::PooledConnection<ConnectionManager<PgConnection>>, StoreErrorType>
    {
        self.pool.get().map_err(|_| {
            StoreErrorType::DatabaseError("Failed to get connection from pool.".to_string())
        })
    }

    pub fn get_read_conn(
        &self,
    ) -> Result<diesel::r2d2::PooledConnection<ConnectionManager<PgConnection>>, StoreErrorType>
    {
        self.read_pool.get().map_err(|_| {
            StoreErrorType::DatabaseError("Failed to get connection from pool.".to_string())
        })
    }

    /*
        run at server startup to modify the database as needed
    */
    pub fn run_migrations(&self) -> Result<String, StoreErrorType> {
        let conn = &mut self.get_conn()?;
        match conn.run_pending_migrations(MIGRATIONS) {
            Ok(m) => Ok(format!("Migrations applied... {:?}", m)),
            Err(e) => Err(StoreErrorType::DatabaseError(format!(
                "Error applying migrations: {}",
                e.to_string()
            ))),
        }
    }
}

impl DataStore for StoreClient {
    fn save_process(&self, process: &Process, bundle_in: &[u8]) -> Result<String, StoreErrorType> {
        use super::schema::processes::dsl::*;
        let conn = &mut self.get_conn()?;

        let new_process = NewProcess {
            process_id: &process.process_id,
            process_data: serde_json::to_value(process).expect("Failed to serialize Process"),
            bundle: bundle_in,
        };

        match diesel::insert_into(processes)
            .values(&new_process)
            .on_conflict(process_id)
            .do_nothing()
            .execute(conn)
        {
            Ok(_) => Ok("saved".to_string()),
            Err(e) => Err(StoreErrorType::from(e)),
        }
    }

    fn get_process(&self, process_id_in: &str) -> Result<Process, StoreErrorType> {
        use super::schema::processes::dsl::*;
        let conn = &mut self.get_read_conn()?;

        let db_process_result: Result<Option<DbProcess>, DieselError> = processes
            .filter(process_id.eq(process_id_in))
            .first(conn)
            .optional();

        match db_process_result {
            Ok(Some(db_process)) => {
                let process: Process = serde_json::from_value(db_process.process_data.clone())?;
                Ok(process)
            }
            Ok(None) => Err(StoreErrorType::NotFound("Process not found".to_string())),
            Err(e) => Err(StoreErrorType::from(e)),
        }
    }

    /*
        If we are trying to write an actual data item
        not just an assignment we need to check that it
        doesnt already exist.
    */
    fn check_existing_message(&self, message: &Message) -> Result<(), StoreErrorType> {
        match &message.message {
            Some(m) => {
                match self.get_message(&m.id) {
                    Ok(parsed) => {
                        /*
                            If the message already exists and it contains
                            an actual message (it is not just an assignment)
                            then throw an error to avoid duplicate data items
                            being written
                        */
                        match parsed.message {
                            Some(_) => Err(StoreErrorType::MessageExists(
                                "Message already exists".to_string(),
                            )),
                            None => Ok(()),
                        }
                    }
                    // The message wasnt found at all so it can be written
                    Err(StoreErrorType::NotFound(_)) => Ok(()),
                    // Some other error happened
                    Err(_) => Err(StoreErrorType::DatabaseError(
                        "Error checking message".to_string(),
                    )),
                }
            }
            None => Ok(()),
        }
    }

    fn save_message(&self, message: &Message, bundle_in: &[u8]) -> Result<String, StoreErrorType> {
        use super::schema::messages::dsl::*;
        let conn = &mut self.get_conn()?;

        self.check_existing_message(message)?;

        let new_message = NewMessage {
            process_id: &message.process_id()?,
            message_id: &message.message_id()?,
            assignment_id: &message.assignment_id()?,
            message_data: serde_json::to_value(message).expect("Failed to serialize Message"),
            epoch: &message.epoch()?,
            nonce: &message.nonce()?,
            timestamp: &message.timestamp()?,
            bundle: bundle_in,
            hash_chain: &message.hash_chain()?,
        };

        match diesel::insert_into(messages)
            .values(&new_message)
            .execute(conn)
        {
            Ok(row_count) => {
                if row_count == 0 {
                    Err(StoreErrorType::DatabaseError(
                        "Error saving message".to_string(),
                    )) // Return a custom error for duplicates
                } else {
                    Ok("saved".to_string())
                }
            }
            Err(e) => Err(StoreErrorType::from(e)),
        }
    }

    fn get_messages(
        &self,
        process_id_in: &str,
        from: &Option<String>,
        to: &Option<String>,
        limit: &Option<i32>,
    ) -> Result<PaginatedMessages, StoreErrorType> {
        use super::schema::messages::dsl::*;
        let conn = &mut self.get_read_conn()?;
        let mut query = messages.filter(process_id.eq(process_id_in)).into_boxed();

        // Apply 'from' timestamp filtering if 'from' is provided
        if let Some(from_timestamp_str) = from {
            let from_timestamp = from_timestamp_str
                .parse::<i64>()
                .map_err(StoreErrorType::from)?;
            query = query.filter(timestamp.gt(from_timestamp));
        }

        // Apply 'to' timestamp filtering if 'to' is provided
        if let Some(to_timestamp_str) = to {
            let to_timestamp = to_timestamp_str
                .parse::<i64>()
                .map_err(StoreErrorType::from)?;
            query = query.filter(timestamp.le(to_timestamp));
        }

        // Apply limit, converting Option<i32> to i64 and adding 1 to check for the next page
        let limit_val = limit.unwrap_or(5000) as i64; // Default limit if none is provided
        let db_messages_result: Result<Vec<DbMessage>, DieselError> = query
            .order(timestamp.asc())
            .limit(limit_val + 1) // Fetch one extra record to determine if a next page exists
            .load(conn);

        match db_messages_result {
            Ok(db_messages) => {
                let has_next_page = db_messages.len() as i64 > limit_val;
                // Take only up to the limit if there's an extra indicating a next page
                let messages_o = if has_next_page {
                    &db_messages[..(limit_val as usize)]
                } else {
                    &db_messages[..]
                };

                let mut messages_mapped: Vec<Message> = vec![];
                for db_message in messages_o.iter() {
                    let json = serde_json::from_value(db_message.message_data.clone())?;
                    let bytes: Vec<u8> = db_message.bundle.clone();
                    let mapped = Message::from_val(&json, bytes)?;
                    messages_mapped.push(mapped);
                }

                let paginated = PaginatedMessages::from_messages(messages_mapped, has_next_page)?;
                Ok(paginated)
            }
            Err(e) => Err(StoreErrorType::from(e)),
        }
    }

    fn get_message(&self, tx_id: &str) -> Result<Message, StoreErrorType> {
        use super::schema::messages::dsl::*;
        let conn = &mut self.get_read_conn()?;

        /*
            get the oldest match. in the case of a message that has
            later assignments, it should be the original message itself.
        */
        let db_message_result: Result<Option<DbMessage>, DieselError> = messages
            .filter(message_id.eq(tx_id).or(assignment_id.eq(tx_id)))
            .order(timestamp.asc())
            .first(conn)
            .optional();

        match db_message_result {
            Ok(Some(db_message)) => {
                let message_val: serde_json::Value =
                    serde_json::from_value(db_message.message_data.clone())?;
                let message: Message = Message::from_val(&message_val, db_message.bundle.clone())?;
                Ok(message)
            }
            Ok(None) => Err(StoreErrorType::NotFound("Message not found".to_string())), // Adjust this error type as needed
            Err(e) => Err(StoreErrorType::from(e)),
        }
    }

    fn get_latest_message(&self, process_id_in: &str) -> Result<Option<Message>, StoreErrorType> {
        use super::schema::messages::dsl::*;
        let conn = &mut self.get_read_conn()?;

        // Get the latest DbMessage
        let latest_db_message_result = messages
            .filter(process_id.eq(process_id_in))
            .order(row_id.desc())
            .first::<DbMessage>(conn);

        match latest_db_message_result {
            Ok(db_message) => {
                // Deserialize the message_data into Message
                let message_val: serde_json::Value =
                    serde_json::from_value(db_message.message_data)
                        .map_err(|e| StoreErrorType::from(e))?;

                let message: Message = Message::from_val(&message_val, db_message.bundle.clone())?;

                Ok(Some(message))
            }
            Err(DieselError::NotFound) => Ok(None), // No messages found
            Err(e) => Err(StoreErrorType::from(e)),
        }
    }

    fn save_process_scheduler(
        &self,
        process_scheduler: &ProcessScheduler,
    ) -> Result<String, StoreErrorType> {
        use super::schema::process_schedulers::dsl::*;
        let conn = &mut self.get_conn()?;

        let new_process_scheduler = NewProcessScheduler {
            process_id: &process_scheduler.process_id,
            scheduler_row_id: &process_scheduler.scheduler_row_id,
        };

        match diesel::insert_into(process_schedulers)
            .values(&new_process_scheduler)
            .on_conflict(process_id)
            .do_nothing()
            .execute(conn)
        {
            Ok(_) => Ok("saved".to_string()),
            Err(e) => Err(StoreErrorType::from(e)),
        }
    }

    fn get_process_scheduler(
        &self,
        process_id_in: &str,
    ) -> Result<ProcessScheduler, StoreErrorType> {
        use super::schema::process_schedulers::dsl::*;
        let conn = &mut self.get_read_conn()?;

        let db_process_result: Result<Option<DbProcessScheduler>, DieselError> = process_schedulers
            .filter(process_id.eq(process_id_in))
            .first(conn)
            .optional();

        match db_process_result {
            Ok(Some(db_process_scheduler)) => {
                let process_scheduler: ProcessScheduler = ProcessScheduler {
                    row_id: Some(db_process_scheduler.row_id),
                    process_id: db_process_scheduler.process_id,
                    scheduler_row_id: db_process_scheduler.scheduler_row_id,
                };
                Ok(process_scheduler)
            }
            Ok(None) => Err(StoreErrorType::NotFound(
                "Process scheduler not found".to_string(),
            )),
            Err(e) => Err(StoreErrorType::from(e)),
        }
    }

    fn save_scheduler(&self, scheduler: &Scheduler) -> Result<String, StoreErrorType> {
        use super::schema::schedulers::dsl::*;
        let conn = &mut self.get_conn()?;

        let new_scheduler = NewScheduler {
            url: &scheduler.url,
            process_count: &scheduler.process_count,
        };

        match diesel::insert_into(schedulers)
            .values(&new_scheduler)
            .on_conflict(url)
            .do_nothing()
            .execute(conn)
        {
            Ok(_) => Ok("saved".to_string()),
            Err(e) => Err(StoreErrorType::from(e)),
        }
    }

    fn update_scheduler(&self, scheduler: &Scheduler) -> Result<String, StoreErrorType> {
        use super::schema::schedulers::dsl::*;
        let conn = &mut self.get_conn()?;

        // Ensure scheduler.row_id is Some(value) before calling this function
        match diesel::update(schedulers.filter(row_id.eq(scheduler.row_id.unwrap())))
            .set((
                process_count.eq(scheduler.process_count),
                url.eq(&scheduler.url),
            ))
            .execute(conn)
        {
            Ok(_) => Ok("updated".to_string()),
            Err(e) => Err(StoreErrorType::from(e)),
        }
    }

    fn get_scheduler(&self, row_id_in: &i32) -> Result<Scheduler, StoreErrorType> {
        use super::schema::schedulers::dsl::*;
        let conn = &mut self.get_read_conn()?;

        let db_scheduler_result: Result<Option<DbScheduler>, DieselError> = schedulers
            .filter(row_id.eq(row_id_in))
            .first(conn)
            .optional();

        match db_scheduler_result {
            Ok(Some(db_scheduler)) => {
                let scheduler: Scheduler = Scheduler {
                    row_id: Some(db_scheduler.row_id),
                    url: db_scheduler.url,
                    process_count: db_scheduler.process_count,
                };
                Ok(scheduler)
            }
            Ok(None) => Err(StoreErrorType::NotFound("Scheduler not found".to_string())),
            Err(e) => Err(StoreErrorType::from(e)),
        }
    }

    fn get_scheduler_by_url(&self, url_in: &String) -> Result<Scheduler, StoreErrorType> {
        use super::schema::schedulers::dsl::*;
        let conn = &mut self.get_read_conn()?;

        let db_scheduler_result: Result<Option<DbScheduler>, DieselError> =
            schedulers.filter(url.eq(url_in)).first(conn).optional();

        match db_scheduler_result {
            Ok(Some(db_scheduler)) => {
                let scheduler: Scheduler = Scheduler {
                    row_id: Some(db_scheduler.row_id),
                    url: db_scheduler.url,
                    process_count: db_scheduler.process_count,
                };
                Ok(scheduler)
            }
            Ok(None) => Err(StoreErrorType::NotFound("Scheduler not found".to_string())),
            Err(e) => Err(StoreErrorType::from(e)),
        }
    }

    fn get_all_schedulers(&self) -> Result<Vec<Scheduler>, StoreErrorType> {
        use super::schema::schedulers::dsl::*;
        let conn = &mut self.get_read_conn()?;

        match schedulers.order(row_id.asc()).load::<DbScheduler>(conn) {
            Ok(db_schedulers) => {
                let schedulers_out: Vec<Scheduler> = db_schedulers
                    .into_iter()
                    .map(|db_scheduler| Scheduler {
                        row_id: Some(db_scheduler.row_id),
                        url: db_scheduler.url,
                        process_count: db_scheduler.process_count,
                    })
                    .collect();
                Ok(schedulers_out)
            }
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
    pub process_data: serde_json::Value,
    pub bundle: Vec<u8>,
}

#[derive(Queryable, Selectable)]
#[diesel(table_name = super::schema::messages)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct DbMessage {
    pub row_id: i32,
    pub process_id: String,
    pub message_id: String,
    pub assignment_id: Option<String>,
    pub message_data: serde_json::Value,
    pub epoch: i32,
    pub nonce: i32,
    pub timestamp: i64,
    pub bundle: Vec<u8>,
    pub hash_chain: String,
}

#[derive(Insertable)]
#[diesel(table_name = super::schema::messages)]
pub struct NewMessage<'a> {
    pub process_id: &'a str,
    pub message_id: &'a str,
    pub assignment_id: &'a str,
    pub message_data: serde_json::Value,
    pub bundle: &'a [u8],
    pub epoch: &'a i32,
    pub nonce: &'a i32,
    pub timestamp: &'a i64,
    pub hash_chain: &'a str,
}

#[derive(Insertable)]
#[diesel(table_name = super::schema::processes)]
pub struct NewProcess<'a> {
    pub process_id: &'a str,
    pub process_data: serde_json::Value,
    pub bundle: &'a [u8],
}

#[derive(Queryable, Selectable)]
#[diesel(table_name = super::schema::schedulers)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct DbScheduler {
    pub row_id: i32,
    pub url: String,
    pub process_count: i32,
}

#[derive(Insertable)]
#[diesel(table_name = super::schema::schedulers)]
pub struct NewScheduler<'a> {
    pub url: &'a str,
    pub process_count: &'a i32,
}

#[derive(Queryable, Selectable)]
#[diesel(table_name = super::schema::process_schedulers)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct DbProcessScheduler {
    pub row_id: i32,
    pub process_id: String,
    pub scheduler_row_id: i32,
}

#[derive(Insertable)]
#[diesel(table_name = super::schema::process_schedulers)]
pub struct NewProcessScheduler<'a> {
    pub process_id: &'a str,
    pub scheduler_row_id: &'a i32,
}
