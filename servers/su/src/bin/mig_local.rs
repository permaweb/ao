use std::io;

use su::domain::migrate_to_local;

#[tokio::main]
async fn main() -> io::Result<()> {
    migrate_to_local().await
}
