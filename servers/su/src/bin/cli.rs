use std::env;
use std::io;
use su::domain::sync_local_drives;
use su::domain::migrate_to_local;
use su::domain::migrate_to_disk;

#[tokio::main]
async fn main() -> io::Result<()> {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        eprintln!("Usage: {} <function_name>", args[0]);
        eprintln!("Available functions: migrate_to_disk, migrate_to_local, sync_local_drives");
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
        _ => {
            eprintln!("Invalid function name: {}", args[1]);
            eprintln!("Available functions: migrate_to_disk, migrate_to_local, sync_local_drives");
        }
    }

    Ok(())
}
