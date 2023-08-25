use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, FnArg, ItemFn};

pub(crate) fn warp_contract(attr: TokenStream, input: TokenStream) -> TokenStream {
    let is_write = match attr.to_string().as_str() {
        "write" => true,
        "view" => false,
        _ => panic!(
            "warp_contract macro requires exactly one attribute: \
        'write' for method changing state or 'view' for view state method \
         e.g. #[warp_contract(write)], #[warp_contract(view)]"
        ),
    };
    let ast = parse_macro_input!(input as ItemFn);
    let ast_clone = ast.clone();
    let fun_name = ast.sig.ident;
    let is_async = ast.sig.asyncness.is_some();
    let (await_spec, write_core_method, view_core_method) = if is_async {
        (
            quote! { .await },
            quote! { ::warp_contracts::methods::write_async },
            quote! { ::warp_contracts::methods::view_async },
        )
    } else {
        (
            quote! {},
            quote! { ::warp_contracts::methods::write_sync },
            quote! { ::warp_contracts::methods::view_sync },
        )
    };

    let inputs = ast.sig.inputs;
    if inputs.len() != 2 {
        panic!("two arguments expected for warp contract handle method, the first one representing state object and the second representing interaction description");
    }
    let state_type = match inputs.first().unwrap() {
        FnArg::Receiver(_) => panic!("self not allowed in warp contract handle function"),
        FnArg::Typed(t) => &t.ty,
    };
    if is_write {
        quote! {
            /*
                Note: in order do optimize communication between host and the WASM module,
                we're storing the state inside the WASM module (for the time of state evaluation).
                This allows to reduce the overhead of passing the state back and forth
                between the host and module with each contract interaction.
                In case of bigger states this overhead can be huge.
                Same approach has been implemented for the AssemblyScript version.

                So the flow (from the SDK perspective) is:
                1. SDK calls exported WASM module function "initState" (with lastly cached state or initial state,
                if cache is empty) - which initializes the state in the WASM module.
                2. SDK calls "handle" function for each of the interaction.
                If given interaction was modifying the state - it is updated inside the WASM module
                - but not returned to host.
                3. Whenever SDK needs to know the current state (eg. in order to perform
                caching or to simply get its value after evaluating all of the interactions)
                - it calls WASM's module "currentState" function.

                The handle function by default does not return the new state -
                it only updates it in the WASM module.
                The handle function returns a value only in case of error
                or calling a "view" function.

                In the future this might also allow to enhance the inner-contracts communication
                - e.g. if the execution network will store the state of the contracts - as the WASM contract module memory
                - it would allow to read other contract's state "directly" from WASM module memory.
                */
            static __WARP_CONTRACT_STATE: ::warp_contracts::optional_cell::OptionalCell<#state_type> =
            ::warp_contracts::optional_cell::OptionalCell::empty();

            const _: () = {
                use ::core::{cell::RefCell, option::Option};
                use ::serde::{Deserialize, Serialize};
                use ::serde_wasm_bindgen::from_value;
                use ::warp_contracts::{
                    optional_cell::OptionalCell,
                    warp_result::{transmission::Transmission, WarpResult},
                    js_imports::log,
                    methods::*
                };
                use ::wasm_bindgen::prelude::*;

                #[wasm_bindgen(js_name = warpContractWrite)]
                pub async fn __warp_contracts_generated_write(interaction: JsValue) -> JsValue {
                    #write_core_method(&__WARP_CONTRACT_STATE, interaction, #fun_name)#await_spec
                }

                #[wasm_bindgen(js_name = initState)]
                pub fn __warp_contracts_generated_init_state(state: &JsValue) -> Option<String> {
                    init_state(&__WARP_CONTRACT_STATE, state)
                }

                #[wasm_bindgen(js_name = currentState)]
                pub fn __warp_contracts_generated_current_state() -> JsValue {
                    current_state(&__WARP_CONTRACT_STATE)
                }

                #[wasm_bindgen(js_name = version)]
                pub fn __warp_contracts_generated_version() -> i32 {
                    return 1;
                }

                // Workaround for now to simplify type reading without as/loader or wasm-bindgen
                // 1 = assemblyscript
                // 2 = rust
                // 3 = go
                // 4 = swift
                // 5 = c
                #[wasm_bindgen(js_name = lang)]
                pub fn __warp_contracts_generated_lang() -> i32 {
                    return 2;
                }
                ()
            };
            #ast_clone
        }
        .into()
    } else {
        quote! {
            const _: () = {
                use ::wasm_bindgen::prelude::*;

                #[wasm_bindgen(js_name = warpContractView)]
                pub async fn __warp_contracts_generated_view(interaction: JsValue) -> JsValue {
                    #view_core_method(&__WARP_CONTRACT_STATE, interaction, #fun_name)#await_spec
                }
            };
            #ast_clone
        }.into()
    }
}
