import { initWasm } from "./wasm";
import type { WorkerMessage } from "./types";
import { MEMORY_MAP, RENDER_CONFIG } from "./constants";

declare var self: Worker;

let ctx: OffscreenCanvasRenderingContext2D | null = null;
let wasm: any;
let wasmMemory: WebAssembly.Memory;
let frameBuf: Uint8ClampedArray;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  switch (e.data.type) {
    case "init-renderer":
      const context = await initWasm("./main.wasm", e.data.wasmMemory);
      wasm = context.instance.exports;
      wasmMemory = context.memory;

      frameBuf = new Uint8ClampedArray(
        wasmMemory.buffer,
        MEMORY_MAP.FRAMEBUFFER_OFFSET,
        RENDER_CONFIG.HEIGHT * RENDER_CONFIG.WIDTH * 4, // data length
      );

      ctx = e.data.canvas.getContext("2d");
      console.log("Renderer initialized with Wasm and Canvas");
      break;
    case "draw":
      if (!ctx || !wasm) return;
      await wasm.draw();

      if (Math.random() < 0.01) console.log("Drawing frame...");

      // Must make a copy since the canvas cannot be given a pointer to shared memory.
      const pixels = new Uint8ClampedArray(frameBuf);
      const imageData = new ImageData(
        pixels,
        RENDER_CONFIG.WIDTH,
        RENDER_CONFIG.HEIGHT,
      );
      ctx.putImageData(imageData, 0, 0);
      break;
  }
};
