export const Box = (v) => ({
  v,
  map: fn => Box(fn(v)),
  chain: fn => fn(v),
  extract: _ => v
})

Box.of = v => Box(v)
 
