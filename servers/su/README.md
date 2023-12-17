

Run local dev server with hot reloading
cargo install systemfd cargo-watch
systemfd --no-pid -s http::8999 -- cargo watch -x run

cargo install diesel_cli --no-default-features --features postgres
diesel setup
diesel migration generate create_contracts
diesel migration generate create_messages

local dev router and 2 sus
systemfd --no-pid -s http::8997 -- cargo watch -x 'run su 8000'
systemfd --no-pid -s http::8998 -- cargo watch -x 'run su 8001'
systemfd --no-pid -s http::8999 -- cargo watch -x 'run router 9000'

build with docker

delete all images and containers then run
docker system prune -a

docker build -t su-app .
docker create --name temp-container su-app
docker cp temp-container:/usr/src/su/target/x86_64-unknown-linux-musl/release/su .

docker build -f RunDockerfile -t su-runner .
docker run --name my-su-app su-runner
