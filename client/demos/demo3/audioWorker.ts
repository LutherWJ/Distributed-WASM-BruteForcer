import type { WorkerMessage } from "./types";
import { initWasm } from "./wasm";
import { MEMORY_MAP, META_OFFSETS } from "./constants";

declare var self: Worker;

let wasm: any;
let wasmMemory: WebAssembly.Memory;

// State
let inBuf: Float32Array;
let sampleRate: number;
let fftSize: number;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const data = e.data;
  switch (data.type) {
    case "init-analyzer":
      inBuf = new Float32Array(data.audioBuffer);
      sampleRate = data.sampleRate;
      fftSize = data.fftSize;

      const context = await initWasm("./main.wasm", data.wasmMemory);
      wasm = context.instance.exports;
      wasmMemory = context.memory;

      // Initialize Metadata in shared memory
      const initMeta = new DataView(
        wasmMemory.buffer,
        MEMORY_MAP.METADATA_OFFSET,
        MEMORY_MAP.METADATA_SIZE,
      );
      initMeta.setUint32(META_OFFSETS.SAMPLE_RATE, sampleRate, true);
      initMeta.setUint32(META_OFFSETS.FFT_SIZE, fftSize, true);
      break;

    case "analyze":
      if (!inBuf || !wasm || !wasmMemory) return;

      const index = Math.floor(sampleRate * data.time);
      if (index + fftSize > inBuf.length) {
        if (Math.random() < 0.01) console.log("Analyze: Index out of bounds", index, inBuf.length);
        return;
      }

      if (Math.random() < 0.01) console.log("Analyze: Processing at index", index, "Time:", data.time);

      // Zero-copy view: Write audio sample directly to the designated memory map offset
      const wasmInput = new Float32Array(
        wasmMemory.buffer,
        MEMORY_MAP.FFT_INPUT_OFFSET,
        fftSize,
      );
      wasmInput.set(inBuf.subarray(index, index + fftSize));

      // Signal Check: Log the max absolute value in this window occasionally
      if (Math.random() < 0.01) {
          let max = 0;
          for (let k = 0; k < fftSize; k++) {
              if (Math.abs(wasmInput[k]) > max) max = Math.abs(wasmInput[k]);
          }
          console.log("Analyze Signal Max:", max);
      }

      // Update current time in metadata
      const metaView = new DataView(
        wasmMemory.buffer,
        MEMORY_MAP.METADATA_OFFSET,
        MEMORY_MAP.METADATA_SIZE,
      );
      metaView.setFloat32(META_OFFSETS.CURRENT_TIME, data.time, true);

      wasm.fft();
      break;
  }
};
