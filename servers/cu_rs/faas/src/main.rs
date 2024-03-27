use std::sync::{Arc, RwLock};
use std::io;
use std::result;
use std::collections::HashMap;
use wasmtime::{Engine, Linker, Module, Store, Error};
use wasi_common::pipe::WritePipe;
use wasi_common::sync::WasiCtxBuilder;
use actix_web::{get, App, HttpResponse, HttpServer, Responder};
use actix_web::web::{Query, Path};

fn invoke_wasm_module(module_name: String, params: HashMap<String, String>) -> result::Result<String, Error> {
    let engine = Engine::default();

    let mut linker = Linker::new(&engine);
    let linker_result = wasi_common::sync::add_to_linker(&mut linker, |s| s);
    if let Err(e) = linker_result {
        return Err(e);
    };

    let stdout_buf: Vec<u8> = vec![];
    let stdout_mutex = Arc::new(RwLock::new(stdout_buf));
    let stdout = WritePipe::from_shared(stdout_mutex.clone());

    let envs: Vec<(String, String)> = params.iter().map(|(key, value)| {
        (key.clone(), value.clone())
    }).collect();

    let wasi_context = WasiCtxBuilder::new()
        .stdout(Box::new(stdout))
        .envs(&envs)?
        .build();
    let mut store = Store::new(&engine, wasi_context);

    println!("Begin get wasm file");
    let module = Module::from_file(&engine, &module_name)?;
    println!("Did set wasm file");
    linker.module(&mut store, &module_name, &module)?;

    let instance = linker.instantiate(&mut store, &module)?;
    let instance_main_result = instance.get_typed_func::<(), ()>(&mut store, "greet");
    println!("found greet");
    if let Err(e) = instance_main_result {
        return Err(e);
    }
    let instance_main = instance_main_result.unwrap();
    instance_main.call(&mut store, ())?;
    println!("function called");

    let mut buffer: Vec<u8> = Vec::new();
    stdout_mutex.read().unwrap().iter().for_each(|i| {
        buffer.push(*i)
    });

    let s = String::from_utf8(buffer)?;
    println!("returned value {}", s.clone());
    Ok(s)
}

#[get("/{module_name}")]
async fn handler(module_name: Path<String>, query: Query<HashMap<String, String>>) -> impl Responder {
    let wasm_module = format!("{}{}", module_name, ".wasm");
    let val_result = invoke_wasm_module(wasm_module, query.into_inner()).expect("wasm invocation error");
    HttpResponse::Ok().body(val_result)
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
