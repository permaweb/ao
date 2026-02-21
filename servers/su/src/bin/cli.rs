use std::env;
use std::io;
use su::domain::reupload_bundles;

#[tokio::main]
async fn main() -> io::Result<()> {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        eprintln!("Usage: {} <function_name>", args[0]);
        eprintln!("Available functions: reupload_bundles");
        return Ok(());
    }

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
        "reupload_bundles" => {
            reupload_bundles(pids, since, delay).await.unwrap();
        }
        _ => {
            eprintln!("Invalid function name: {}", args[1]);
            eprintln!("Available functions: reupload_bundles");
        }
    }

    Ok(())
}
