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
      log_u32: () => {},
      log_f32: () => {},
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
