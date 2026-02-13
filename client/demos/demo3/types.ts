import useVisualizer from "./AudioVisualizer";

export type VisualizerOptions = {
  uploadInput?: HTMLInputElement;
  playBtn: HTMLButtonElement;
  canvas: HTMLCanvasElement;
  staticFileUrl?: string;
  fftSize?: number;
};

export type WorkerMessage =
  | {
      type: "init-analyzer";
      audioBuffer: SharedArrayBuffer;
      wasmMemory: WebAssembly.Memory;
      sampleRate: number;
      fftSize: number;
    }
  | { type: "init-bridge"; wasmMemory: WebAssembly.Memory }
  | {
      type: "init-renderer";
      wasmMemory: WebAssembly.Memory;
      canvas: OffscreenCanvas;
    }
  | { type: "analyze"; time: number }
  | { type: "draw" };

export type Visualizer = ReturnType<typeof useVisualizer>;
