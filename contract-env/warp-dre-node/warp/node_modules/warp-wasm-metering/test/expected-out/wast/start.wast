(module
  (type $c (func))
  (type $a (func (param f32)))
  (type $b (func (param i32) (result i32)))
  (type $d (func (param i64)))

  (import "foo" "bar" (func))
  (import "foo" "bar" (func (type $a)))
  (import "metering" "usegas" (func $usegas (type $d)))
  (memory (data "hi"))
  (start 0)
  (table 0 1 anyfunc)
  (func (type $c)
    (call $usegas (i64.const 3))  
  )
  (func (type $a)
      (call $usegas (i64.const 6))  
        (drop (i32.const 42)))
  (export "e" (func 1)))


