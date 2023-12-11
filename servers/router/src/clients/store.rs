

use diesel::pg::PgConnection;
use diesel::prelude::*;
use diesel::r2d2::ConnectionManager;
use diesel::r2d2::Pool;
use std::env::VarError;

use crate::config::Config;
use crate::su_router::{Process, Scheduler};

#[derive(Debug)]
pub enum StoreErrorType {
    DatabaseError(String),
    NotFound(String),
    JsonError(String)
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
        let config = Config::new().expect("Failed to read configuration");
        let database_url = config.database_url;
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
            scheduler_row_id: &process.scheduler_row_id,
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
                let process: Process = Process {
                    row_id: Some(db_process.row_id),
                    process_id: db_process.process_id,
                    scheduler_row_id: db_process.scheduler_row_id,
                };
                Ok(process)
            },
            Ok(None) => Err(StoreErrorType::NotFound("Process not found".to_string())), 
            Err(e) => Err(StoreErrorType::from(e)),
        }
    }

    pub fn save_scheduler(&self, scheduler: &Scheduler) -> Result<String, StoreErrorType> {
        use super::schema::schedulers::dsl::*;
        let conn = &mut self.get_conn()?;
    
        let new_scheduler = NewScheduler {
            url: &scheduler.url,
        };
    
        match diesel::insert_into(schedulers)
            .values(&new_scheduler)
            .on_conflict(url)
            .do_nothing() 
            .execute(conn)
        {
            Ok(_) => {
                Ok("saved".to_string())
            },
            Err(e) => Err(StoreErrorType::from(e)),
        }
    }

    pub fn get_scheduler(&self, row_id_in: &i32) -> Result<Scheduler, StoreErrorType> {
        use super::schema::schedulers::dsl::*;
        let conn = &mut self.get_conn()?;
    
        let db_scheduler_result: Result<Option<DbScheduler>, DieselError> = schedulers
            .filter(row_id.eq(row_id_in))
            .first(conn)
            .optional();
    
        match db_scheduler_result {
            Ok(Some(db_scheduler)) => {
                let scheduler: Scheduler = Scheduler {
                    row_id: Some(db_scheduler.row_id),
                    url: db_scheduler.url
                };
                Ok(scheduler)
            },
            Ok(None) => Err(StoreErrorType::NotFound("Scheduler not found".to_string())), 
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
    pub scheduler_row_id: i32
}


#[derive(Insertable)]
#[diesel(table_name = super::schema::processes)]
pub struct NewProcess<'a> {
    pub process_id: &'a str,
    pub scheduler_row_id: &'a i32,
}

#[derive(Queryable, Selectable)]
#[diesel(table_name = super::schema::schedulers)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct DbScheduler {
    pub row_id: i32,
    pub url: String,
}


#[derive(Insertable)]
#[diesel(table_name = super::schema::schedulers)]
pub struct NewScheduler<'a> {
    pub url: &'a str,
}



