mod utils;

#[allow(unused)]
use crate::utils::set_panic_hook;
#[allow(unused_imports)]
use wasmedge_bindgen::*;
use wasmedge_bindgen_macro::*;
use wasmedge_quickjs::*;

#[wasmedge_bindgen]
pub fn greet() -> String {
    let mut ctx = Context::new();

    let code = r#"
        import("/wasm/main.js")
            .then(main => main.init())
    "#;

    let p = ctx.eval_global_str(code);
    ctx.promise_loop_poll();
    println!("promise created {:?}", p);

    if let JsValue::Promise(ref p) = p {
        let module = p.get_result();
        println!("module created {:?}", module);
        if let JsValue::Object(obj_mod) = module {
            let func = obj_mod.get("init");
            println!("init func instantiated {:?}", func);

            if let JsValue::Function(func) = func {
                let result = func.call(&mut []);
                println!("init called");
                println!("result {:?}", result);
            }
        }
    }

    "hellow world".to_string()
}