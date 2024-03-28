
use std::sync::{Arc, RwLock};
use std::io;
use std::result;
use std::collections::HashMap;
use actix_web::{get, App, HttpResponse, HttpServer, Responder};
use actix_web::web::{Query, Path};
use wasmedge_sdk::Module;
use wasmedge_sdk::{config::{ConfigBuilder, CommonConfigOptions, HostRegistrationConfigOptions}, params, NeverType, VmBuilder, Vm};
use wasmedge_sdk_bindgen::*;

fn do_js_work() -> Result<(), Box<dyn std::error::Error>> {
    let common_options = CommonConfigOptions::default()
        .bulk_memory_operations(true)
        .multi_value(true)
        .mutable_globals(true)
        .non_trap_conversions(true)
        .reference_types(true)
        .sign_extension_operators(true)
        .simd(true);
    let host_options = HostRegistrationConfigOptions::default()
        .wasi(true);
    let config = ConfigBuilder::new(common_options)
        .with_host_registration_config(host_options)
        .build()
        .unwrap();

    let vm = VmBuilder::new().with_config(config).build()?;
    let module = Module::from_file(None, "wasm/js_lib.wasm").unwrap();
    let vm = vm.register_module(None, module).unwrap();
    let mut bg = Bindgen::new(vm);

    match bg.run_wasm("init", params!()) {
        Ok(res) => println!("init result {:?}", res),
        Err(e) => println!("error {:?}", e)
    };

    Ok(())
}

fn do_wasm_work() -> Result<(), Box<dyn std::error::Error>> {
    let common_options = CommonConfigOptions::default()
        .bulk_memory_operations(true)
        .multi_value(true)
        .mutable_globals(true)
        .non_trap_conversions(true)
        .reference_types(true)
        .sign_extension_operators(true)
        .simd(true);
    let host_options = HostRegistrationConfigOptions::default()
        .wasi(true);
    let config = ConfigBuilder::new(common_options)
        .with_host_registration_config(host_options)
        .build()
        .unwrap();

    let vm = VmBuilder::new().with_config(config).build()?;
    let module = Module::from_file(None, "wasm/client_lib.wasm").unwrap();
    let vm = vm.register_module(None, module).unwrap();
    let mut bg = Bindgen::new(vm);

    match bg.run_wasm("greet", params!()) {
        Ok(res) => println!("{}", res.unwrap().pop().unwrap().downcast::<String>().unwrap()),
        Err(e) => println!("{:?}", e)
    };

    Ok(())
}

#[get("/{module_name}")]
async fn handler(_module_name: Path<String>, _query: Query<HashMap<String, String>>) -> impl Responder {
    _ = do_js_work();
    return "";
}

#[actix_web::main]
async fn main() -> io::Result<()> {
    HttpServer::new(|| {
        App::new().service(handler)
    })
    .bind("127.0.0.1:5050")?
    .run()
    .await
}
