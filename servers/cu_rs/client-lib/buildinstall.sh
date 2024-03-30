cargo build --target wasm32-wasi

cd ../target/wasm32-wasi/debug

yes | cp -rf client_lib.wasm ../../../faas/wasm/client_lib.wasm