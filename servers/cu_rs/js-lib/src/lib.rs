use wasmedge_quickjs::*;
use wasmedge_bindgen_macro::*;

#[wasmedge_bindgen]
pub fn init() {
    let mut ctx = Context::new();

    let code = r#"
        import("main.js")
            .then(res => {
                return res.init();
            })
    "#;

    let p = ctx.eval_global_str(code);
    ctx.promise_loop_poll();
    if let JsValue::Promise(ref p) = p {
        let v = p.get_result();
        println!("v: {:?}", v);
    }
}
