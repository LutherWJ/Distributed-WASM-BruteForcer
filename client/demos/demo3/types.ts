import useVisualizer from "./AudioVisualizer";

export type VisualizerOptions = {
  uploadInput?: HTMLInputElement;
  micBtn: HTMLButtonElement;
  playBtn: HTMLButtonElement;
  canvas: HTMLCanvasElement;
  staticFileUrl?: string;
  fftSize?: number;
};

export type WorkerMessage =
  | {
      type: "init-analyzer";
      audioBuffer?: SharedArrayBuffer;
      wasmMemory: WebAssembly.Memory;
      bridgeBuf: SharedArrayBuffer;
      sampleRate: number;
      fftSize: number;
    }
  | {
      type: "init-renderer";
      wasmMemory: WebAssembly.Memory;
      bridgeBuf: SharedArrayBuffer;
      canvas: OffscreenCanvas;
    }
  | { type: "analyze"; time: number }
  | { type: "analyze-realtime"; samples: Float32Array; time?: number }
  | { type: "draw" };

export type Visualizer = ReturnType<typeof useVisualizer>;
