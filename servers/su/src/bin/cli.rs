use std::env;
use std::io;
use su::domain::migrate_to_disk;
use su::domain::migrate_to_local;
use su::domain::sync_local_drives;
use su::domain::reupload_bundles;

#[tokio::main]
async fn main() -> io::Result<()> {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        eprintln!("Usage: {} <function_name>", args[0]);
        eprintln!("Available functions: migrate_to_disk, migrate_to_local, sync_local_drives, reupload_bundles");
        return Ok(());
    }

    let interval = if args.len() >= 3 && args[1] == "sync_local_drives" {
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

    let pids = if args.len() > 3 && args[1] == "reupload_bundles" {
        args[2].clone()
    } else {
        eprintln!("Must provid pids, and since value");
        return Ok(());
    };

    let since = if args.len() > 3 && args[1] == "reupload_bundles" {
        args[3].clone()
    } else {
        eprintln!("Must provid since");
        return Ok(());
    };

    let delay = if args.len() > 4 && args[1] == "reupload_bundles" {
        match args[4].parse::<u64>() {
            Ok(val) => val,
            Err(_) => {
                10
            }
        }
    } else {
        10
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
        "reupload_bundles" => {
            reupload_bundles(pids, since, delay).await.unwrap();
        }
        _ => {
            eprintln!("Invalid function name: {}", args[1]);
            eprintln!("Available functions: migrate_to_disk, migrate_to_local, sync_local_drives");
        }
    }

    Ok(())
}
