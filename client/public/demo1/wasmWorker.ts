declare var self: Worker;

type WasmContext = {
  instance: WebAssembly.Instance;
  memory: WebAssembly.Memory;
};

async function initWasm(
  url: string,
  memory: WebAssembly.Memory,
): Promise<WasmContext> {
  const importObject = {
    env: {
      memory: memory,
    },
  };

  const module = await fetch(url);
  const wasm = await WebAssembly.instantiateStreaming(module, importObject);

  return {
    instance: wasm.instance,
    memory: memory,
  };
}

const url = "main.wasm";
let ctx: WasmContext | undefined = undefined;

self.onmessage = async (event: MessageEvent) => {
  const params = event.data;

  if (params.type === "init") {
    ctx = await initWasm(url, params.memory);
    self.postMessage({ type: "ready" });
    return;
  }

  try {
    if (!ctx) {
      throw new Error("WasmContext is not defined");
    }

    // @ts-ignore
    const start = performance.now();
    ctx.instance.exports.blur(
      params.inputOffset,
      params.outputOffset,
      params.width,
      params.height,
      params.radius,
    );
    const end = performance.now();

    self.postMessage({ result: "done", duration: end - start });
  } catch (err) {
    self.postMessage({
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
