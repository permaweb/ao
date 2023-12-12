

Run local dev server with hot reloading
cargo install systemfd cargo-watch
systemfd --no-pid -s http::8999 -- cargo watch -x run

cargo install diesel_cli --no-default-features --features postgres
diesel setup
diesel migration generate create_contracts
diesel migration generate create_messages

local dev router and su
systemfd --no-pid -s http::8999 -- cargo watch -x 'run su 9000'
systemfd --no-pid -s http::8998 -- cargo watch -x 'run router 8000'