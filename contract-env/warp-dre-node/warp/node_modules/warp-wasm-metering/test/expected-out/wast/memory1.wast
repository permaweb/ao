(module 
  (type $a (func(param i64)))
  (import "metering" "usegas" (func $useGas (type $a)))
  (memory 1 2)
  (data (i32.const 0) "a")
  (data (i32.const 65535) "b"))
