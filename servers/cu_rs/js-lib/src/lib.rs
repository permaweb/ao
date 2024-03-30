use wasmedge_quickjs::*;
use wasmedge_bindgen_macro::*;

pub fn init() {
    let mut ctx = Context::new();

    let code = r#"
        let module = import("main.js")
        module
    "#;

    let p = ctx.eval_global_str(code);
    ctx.promise_loop_poll();
    if let JsValue::Promise(ref p) = p {
        let module = p.get_result();
        println!("v: {:?}", module);

        if let JsValue::Object(obj_mod) = module {
            let func = obj_mod.get("init");
            println!("init func: {:?}", func);

            if let JsValue::Function(func) = func {
                let result = func.call(&mut []);
                println!("result {:?}", result);
            }
        }
    }
}
