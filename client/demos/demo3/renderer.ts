import { initWasm } from "./wasm";
import type { WorkerMessage } from "./types";
import { MEMORY_MAP, RENDER_CONFIG } from "./constants";

declare var self: DedicatedWorkerGlobalScope;

let ctx: OffscreenCanvasRenderingContext2D | null = null;
let wasm: any;
let wasmMemory: WebAssembly.Memory;
let fbView: Uint8ClampedArray;
let imageData: ImageData;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const data = e.data;
  switch (data.type) {
    case "init-bridge":
      // Initialize Wasm using the shared memory provided by the main thread
      const context = await initWasm("./renderer.wasm", data.wasmMemory);
      wasm = context.instance.exports;
      wasmMemory = context.memory;

      // Point to the framebuffer in shared memory
      fbView = new Uint8ClampedArray(
        wasmMemory.buffer,
        MEMORY_MAP.FRAMEBUFFER_OFFSET,
        RENDER_CONFIG.WIDTH * RENDER_CONFIG.HEIGHT * 4
      );
      imageData = new ImageData(fbView, RENDER_CONFIG.WIDTH, RENDER_CONFIG.HEIGHT);
      break;

    case "init-canvas":
      ctx = data.canvas.getContext("2d");
      break;

    case "draw":
      if (!ctx || !wasm) return;

      // 1. Tell Wasm to render the next frame into the framebuffer
      wasm.draw();

      // 2. Put the pixels onto the canvas. 
      ctx.putImageData(imageData, 0, 0);
      break;
  }
};
