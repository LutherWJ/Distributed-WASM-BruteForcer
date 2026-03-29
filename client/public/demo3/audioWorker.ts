import type { WorkerMessage } from "./types";
import { initWasm } from "./wasm";
import { MEMORY_MAP, META_OFFSETS } from "./constants";

declare var self: Worker;

let wasm: any;
let wasmMemory: WebAssembly.Memory;
let bridgeBuf: SharedArrayBuffer;

// State
let inBuf: Float32Array;
let sampleRate: number;
let fftSize: number;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const data = e.data;
  switch (data.type) {
    case "init-analyzer":
      if (data.audioBuffer) {
        inBuf = new Float32Array(data.audioBuffer);
      }
      sampleRate = data.sampleRate;
      fftSize = data.fftSize;
      bridgeBuf = data.bridgeBuf;

      const context = await initWasm("main.wasm", data.wasmMemory);
      wasm = context.instance.exports;
      wasmMemory = context.memory;

      // Initialize Metadata in shared memory
      const initMeta = new DataView(
        bridgeBuf,
        MEMORY_MAP.METADATA_OFFSET,
        MEMORY_MAP.METADATA_SIZE,
      );
      initMeta.setUint32(META_OFFSETS.SAMPLE_RATE, sampleRate, true);
      initMeta.setUint32(META_OFFSETS.FFT_SIZE, fftSize, true);

      self.postMessage({ type: "analyzer-ready" });
      break;

    case "analyze":
      if (!inBuf || !wasm || !bridgeBuf) return;

      const index = Math.floor(sampleRate * data.time);
      if (index + fftSize > inBuf.length) return;

      const wasmInput = new Float32Array(
        bridgeBuf,
        MEMORY_MAP.FFT_INPUT_OFFSET,
        fftSize,
      );
      wasmInput.set(inBuf.slice(index, index + fftSize));

      // Update current time in metadata
      const metaView = new DataView(
        bridgeBuf,
        MEMORY_MAP.METADATA_OFFSET,
        MEMORY_MAP.METADATA_SIZE,
      );
      metaView.setFloat32(META_OFFSETS.CURRENT_TIME, data.time, true);

      wasm.fft();
      break;

    case "analyze-realtime":
      if (!wasm || !bridgeBuf) return;

      const realTimeInput = new Float32Array(
        bridgeBuf,
        MEMORY_MAP.FFT_INPUT_OFFSET,
        fftSize,
      );
      realTimeInput.set(data.samples);

      // Update current time in metadata
      const rtMetaView = new DataView(
        bridgeBuf,
        MEMORY_MAP.METADATA_OFFSET,
        MEMORY_MAP.METADATA_SIZE,
      );
      // We'll need to pass time from the message
      if ("time" in data) {
        rtMetaView.setFloat32(META_OFFSETS.CURRENT_TIME, (data as any).time, true);
      }

      wasm.fft();
      break;
  }
};
