use std::env;
use std::io;
use su::domain::migrate_to_disk;
use su::domain::migrate_to_local;
use su::domain::sync_local_drives;
use su::domain::merge_dbs;

#[tokio::main]
async fn main() -> io::Result<()> {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        eprintln!("Usage: {} <function_name> [args...]", args[0]);
        eprintln!("Available functions: migrate_to_disk, migrate_to_local, sync_local_drives, merge_dbs");
        eprintln!("  merge_dbs: {} merge_dbs <src_file_db> <src_index_db> [dest_file_db] [dest_index_db]", args[0]);
        return Ok(());
    }

    let interval = if args.len() >= 3 {
        match args[2].parse::<u64>() {
            Ok(val) => val,
            Err(_) => {
                eprintln!("Invalid interval: {}. Using default (5 seconds).", args[3]);
                5
            }
        }
    } else {
        5
    };

    match args[1].as_str() {
        "migrate_to_disk" => {
            migrate_to_disk().await.unwrap();
        }
        "migrate_to_local" => {
            migrate_to_local().await.unwrap();
        }
        "sync_local_drives" => {
            sync_local_drives(interval).await.unwrap();
        }
        "merge_dbs" => {
            if args.len() < 4 || args.len() > 6 {
                eprintln!("Usage: {} merge_dbs <src_file_db> <src_index_db> [dest_file_db] [dest_index_db]", args[0]);
                return Ok(());
            }
            let dest_file = if args.len() >= 5 { Some(args[4].as_str()) } else { None };
            let dest_index = if args.len() >= 6 { Some(args[5].as_str()) } else { None };
            
            match merge_dbs(&args[2], &args[3], dest_file, dest_index) {
                Ok(()) => println!("Database merge completed successfully"),
                Err(e) => eprintln!("Error merging databases: {}", e),
            }
        }
        _ => {
            eprintln!("Invalid function name: {}", args[1]);
            eprintln!("Available functions: migrate_to_disk, migrate_to_local, sync_local_drives, merge_dbs");
        }
    }

    Ok(())
}
