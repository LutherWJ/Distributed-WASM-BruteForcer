import type { Job } from "./types.ts";

const PAGE_SIZE = 65536;

declare var self: Worker;

let wasm: any;
let exports: any;
let wasmMemory: WebAssembly.Memory;

(async () => {
  console.log("[Worker] Initializing WASM...");
  const wasmCtx = await initWasm();
  wasm = wasmCtx.instance;
  exports = wasm.exports;
  wasmMemory = wasmCtx.memory;

  const attemptsPtr = exports.get_count_ptr();
  console.log("[Worker] WASM ready, sending buffer and pointer");
  self.postMessage({
    type: "ready",
    buffer: wasmCtx.memory.buffer,
    ptr: attemptsPtr,
  });
})();

self.onmessage = (event: MessageEvent) => {
  const job: Job = event.data;
  const encoder = new TextEncoder();
  const charset = encoder.encode(job.charset);

  if (!wasm || !wasmMemory) {
    console.error("WASM not initialized");
    return;
  }

  try {
    const inputPtr = exports.get_input_buffer_ptr();
    const mem = new Uint8Array(wasmMemory.buffer);

    // Copy target (32 bytes)
    const targetArray = new Uint8Array(job.target);
    mem.set(targetArray, inputPtr);

    // Copy charset (after 32 bytes)
    mem.set(charset, inputPtr + 32);

    // @ts-ignore
    const found = exports.crack(
      inputPtr,
      32, // Hash is 32 bytes long
      inputPtr + 32,
      charset.length,
      job.length,
      job.index,
      job.size,
    );

    let password: string | undefined;
    if (found) {
      const passPtr = exports.get_password_ptr();
      const passBuf = new Uint8Array(wasmMemory.buffer, passPtr, job.length);

      // Create a non-shared copy because TextDecoder doesn't support SharedArrayBuffer
      const passCopy = new Uint8Array(passBuf);
      const decoder = new TextDecoder();
      password = decoder.decode(passCopy);
      console.log("[Worker] Password found:", password);
      self.postMessage({ type: "found", password: password });
      return;
    }
    self.postMessage({ type: "completed" });
  } catch (err) {
    console.error("Error in WASM execution: ", err);
    self.postMessage({ type: "error" });
    return;
  }
};

type WasmContext = {
  instance: WebAssembly.Instance;
  memory: WebAssembly.Memory;
};

async function initWasm(): Promise<WasmContext> {
  const memory = new WebAssembly.Memory({
    initial: 32,
    maximum: PAGE_SIZE,
    shared: true,
  });

  const importObject = {
    env: {
      memory: memory,
    },
  };

  const res = await fetch("./main.wasm");
  const buf = await res.arrayBuffer();
  const wasm = await WebAssembly.instantiate(buf, importObject);
  return {
    instance: wasm.instance,
    memory: memory,
  };
}
