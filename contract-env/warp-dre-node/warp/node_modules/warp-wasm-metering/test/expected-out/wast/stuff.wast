(module
  (type $a (func (param f32)))
  (type $b (func (param i32) (result i32)))
  (type $c (func))
  (type $d (func (param i64)))

  (import "foo" "bar" (func (type $a)))
  (import "metering" "usegas" (func $usegas (type $d)))
  (memory (data "hi"))
  (start 2)
  (table 0 1 anyfunc)
  (func (type $c)
    (call $usegas (i64.const 3))  
  )
  (func (type 0)
      (call $usegas (i64.const 6))  
        (drop (i32.const 42)))
  (export "e" (func 2)))


