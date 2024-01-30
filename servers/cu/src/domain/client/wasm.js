export function doesExceedMaximumHeapSizeWith ({ PROCESS_WASM_HEAP_MAX_SIZE }) {
  /**
   * This is simple right now, but could be more complex later, so wrapping
   * as a side-effect will be better for long term
   *
   * For now, heap is simple array buffer
   */
  return async ({ heap }) => heap.byteLength > PROCESS_WASM_HEAP_MAX_SIZE
}
