all:build bindgen

build:
	RUSTFLAGS="--cfg=web_sys_unstable_apis --Z wasm_c_abi=spec" \
	cargo +nightly build \
	    -Zbuild-std=std,panic_unwind,panic_abort \
	    --target=wasm64-unknown-unknown \
	    --release

bindgen:
	cbindgen --config cbindgen.toml --crate aorust --output aorust.h

clean:
	cargo clean
	rm aorust.h
