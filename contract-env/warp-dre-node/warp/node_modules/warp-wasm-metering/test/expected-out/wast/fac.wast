(module
  (type $a (func(param i64) (result i64)))
  (type $b (func(param i64)))

  (import "metering" "usegas" (func $useGas (type $b)))

  (func $fac (type $a)
    (call $useGas (i64.const 8))
    (if i64
      (i64.lt_s (get_local 0) (i64.const 1))
      (then
        (call $useGas (i64.const 4))
        (i64.const 1))
      (else
        (call $useGas (i64.const 9))
        (i64.mul
          (get_local 0)
          (call $fac
            (i64.sub
              (get_local 0)
              (i64.const 1))))))
      (call $useGas (i64.const 3))
    )
  (export "fac" (func $fac)))
