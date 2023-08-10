(module
  (type $a (func(param i32 i32) (result i32)))   
  (type $b (func(param i64)))
  (type $c (func(param i64)))
 
  (import "metering" "usegas" (func (type $b)))
  (import "teat" "adf" (global i64))
  (import "metering" "usegas" (func $useGas (type $c)))
  (func $addTwo (type $a)
    (call $useGas (i64.const 9))
    (i32.add
      (get_local 0)
      (get_local 1)))
  (export "addTwo" (func $addTwo)))
