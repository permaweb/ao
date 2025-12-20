all:build bindgen

build:
	RUSTFLAGS="--Z wasm_c_abi=spec " \
	cargo +nightly build \
	    -Zbuild-std=std,panic_unwind,panic_abort \
	    --target=wasm64-unknown-unknown \
	    --release

bindgen:
	cbindgen --config cbindgen.toml --crate aorust --output aorust.h

clean:
	cargo clean
	rm aorust.h

opt:
	wasm-opt --post-emscripten -O3 --low-memory-unused process.wasm --enable-bulk-memory --enable-memory64 --no-validation -o process.wasm
