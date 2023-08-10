(module
  (func $fac (param i32) (result i32)
    (if (result i32) (i32.lt_s (get_local 0) (i32.const 1))
      (then (i32.const 1))
      (else
        (i32.mul (get_local 0) (call $fac (i32.sub (get_local 0) (i32.const 1))))
      )
    )
  )
  (export "fac" (func $fac))
)
