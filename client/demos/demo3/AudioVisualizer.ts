import type { VisualizerOptions, WorkerMessage } from "./types";
import { AUDIO_CONFIG } from "./constants";

const useVisualizer = (options: VisualizerOptions) => {
  const { uploadInput, playBtn, canvas, staticFileUrl } = options;

  // Worker state
  const analyzer: Worker = new Worker("./audioWorker.js");
  const renderer: Worker = new Worker("./renderer.js");
  
  // Create shared Wasm memory (10 pages = 640KB, plenty for FFT)
  const wasmMemory = new WebAssembly.Memory({
    initial: 10,
    maximum: 100,
    shared: true,
  });
  
  // @ts-ignore - buffer is SharedArrayBuffer when shared: true
  const bridgeBuf: SharedArrayBuffer = wasmMemory.buffer;

  // Audio state
  const audioCtx: AudioContext = new window.AudioContext();
  let audioBuf: AudioBuffer | null = null;
  let sourceNode: AudioBufferSourceNode | null = null;
  let isPlaying: boolean = false;

  // Canvas state
  const offscreen = canvas.transferControlToOffscreen();

  renderer.postMessage({ type: "init-bridge", wasmMemory } as WorkerMessage);
  renderer.postMessage({ type: "init-canvas", canvas: offscreen } as WorkerMessage, [offscreen]);

  const setup = async (buf: ArrayBuffer) => {
    audioBuf = await audioCtx.decodeAudioData(buf);

    // Create SharedArrayBuffer for raw Audio Data
    const data = audioBuf.getChannelData(0);
    const sab = new SharedArrayBuffer(
      data.length * Float32Array.BYTES_PER_ELEMENT,
    );
    new Float32Array(sab).set(data);

    analyzer.postMessage({
      type: "init-analyzer",
      audioBuffer: sab,
      wasmMemory,
      sampleRate: audioBuf.sampleRate,
      fftSize: options.fftSize || AUDIO_CONFIG.DEFAULT_FFT_SIZE,
    } as WorkerMessage);
  };

  const play = () => {
    if (!audioBuf) return;
    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuf;
    sourceNode.connect(audioCtx.destination);

    sourceNode.onended = () => (isPlaying = false);
    sourceNode.start();
    isPlaying = true;

    const tick = () => {
      if (!isPlaying) return;

      analyzer.postMessage({
        type: "analyze",
        time: audioCtx.currentTime,
      } as WorkerMessage);

      renderer.postMessage({ type: "draw" } as WorkerMessage);

      requestAnimationFrame(tick);
    };
    tick();
  };

  // Event Listeners
  uploadInput?.addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) setup(await file.arrayBuffer());
  });

  playBtn.addEventListener("click", () => {
    if (audioCtx.state === "suspended") audioCtx.resume();
    isPlaying ? (sourceNode?.stop(), (isPlaying = false)) : play();
  });

  // Support Static Files
  if (staticFileUrl) {
    fetch(staticFileUrl)
      .then((res) => res.arrayBuffer())
      .then(setup);
  }

  return {
    stop: () => sourceNode?.stop(),
    getAudioCtx: () => audioCtx,
  };
};

export default useVisualizer;
