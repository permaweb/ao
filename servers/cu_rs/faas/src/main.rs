
use std::io;
use std::collections::HashMap;
use actix_web::{get, App, HttpServer, Responder};
use actix_web::web::{Query, Path};
use wasmedge_sdk::Module;
use wasmedge_sdk::{config::{ConfigBuilder, CommonConfigOptions, HostRegistrationConfigOptions}, params, VmBuilder};
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

    let vm = VmBuilder::new().build();
    match vm {
        Ok(vm) => {
            println!("Vm created");
            let module = Module::from_file(Some(&config), "wasm/js_lib.wasm");
            match module {
                Ok(module) => {
                    println!("Module created");
                    let vm = vm.register_module(Some("js_lib"), module);
                    match vm {
                        Ok(vm) => {
                            println!("Module registered to vm");
        
                            match vm.run_func(Some("js_lib"), "init", params!()) {
                                Ok(res) => println!("init result {:?}", res),
                                Err(e) => println!("failed to run init {:?}", e)
                            };
                        },
                        Err(e) => println!("failed to register module to vm {:?}", e)
                    }
                },
                Err(e) => println!("failed to create module {:?}", e)
            }            
        },
        Err(e) => println!("failed to build vm {:?}", e)
    }    

    Ok(())
}

#[allow(unused)]
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

    match bg.run_wasm("greet", vec![]) {
        Ok(res) => println!("{}", res.unwrap().pop().unwrap().downcast::<String>().unwrap()),
        Err(e) => println!("{:?}", e)
    };

    Ok(())
}

#[get("/{module_name}")]
async fn handler(_module_name: Path<String>, _query: Query<HashMap<String, String>>) -> impl Responder {
    _ = do_wasm_work();
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
