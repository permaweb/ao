use std::env;
use std::io;
use su::domain::reupload_bundles;
use su::domain::migrate_whitelist;

#[tokio::main]
async fn main() -> io::Result<()> {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        eprintln!("Usage: {} <function_name>", args[0]);
        eprintln!("Available functions: reupload_bundles, migrate_whitelist");
        return Ok(());
    }

    match args[1].as_str() {
        "migrate_whitelist" => {
            migrate_whitelist().await.unwrap();
        }
        "reupload_bundles" => {
            let pids = if args.len() > 3 {
                args[2].clone()
            } else {
                eprintln!("Must provide pids, and since value");
                return Ok(());
            };

            let since = if args.len() > 3 {
                args[3].clone()
            } else {
                eprintln!("Must provide since");
                return Ok(());
            };

            let delay = if args.len() > 4 {
                match args[4].parse::<u64>() {
                    Ok(val) => val,
                    Err(_) => 10,
                }
            } else {
                10
            };

            reupload_bundles(pids, since, delay).await.unwrap();
        }
        _ => {
            eprintln!("Invalid function name: {}", args[1]);
            eprintln!("Available functions: reupload_bundles, migrate_whitelist");
        }
    }

    Ok(())
}
