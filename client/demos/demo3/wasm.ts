type WasmContext = {
  instance: WebAssembly.Instance;
  memory: WebAssembly.Memory;
};

export async function initWasm(
  url: string,
  memory?: WebAssembly.Memory,
): Promise<WasmContext> {
  const wasmMemory =
    memory ||
    new WebAssembly.Memory({
      initial: 1,
      maximum: 10,
      shared: true,
    });

  const importObject = {
    env: {
      memory: wasmMemory,
      log_u32: (value: number) => console.log(`[WASM fft_size]`, value),
      log_f32: (value: number) => console.log(`[WASM f32 val]`, value),
    },
  };

  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const wasm = await WebAssembly.instantiate(buf, importObject);
  return {
    instance: wasm.instance,
    memory: wasmMemory,
  };
}
