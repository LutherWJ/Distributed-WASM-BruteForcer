import type { VisualizerOptions, WorkerMessage } from "./types";
import { AUDIO_CONFIG } from "./constants";

const useVisualizer = (options: VisualizerOptions) => {
  const { uploadInput, playBtn, micBtn, canvas, staticFileUrl } = options;
  playBtn.disabled = true; // Disable play button initially
  micBtn.disabled = true;

  // Worker state
  const analyzer: Worker = new Worker("./audioWorker.js");
  const renderer: Worker = new Worker("./renderer.js");

  // Listen for messages from the analyzer worker
  analyzer.onmessage = (e: MessageEvent<WorkerMessage>) => {
    if (e.data.type === "analyzer-ready") {
      playBtn.disabled = false;
      micBtn.disabled = false;
    }
  };

  // Create shared Wasm memory (100 pages = 6.4MB)
  const wasmMemory = new WebAssembly.Memory({
    initial: 100,
    maximum: 100,
    shared: true,
  });

  // @ts-ignore buffer is SharedArrayBuffer when shared: true
  const bridgeBuf: SharedArrayBuffer = wasmMemory.buffer;

  // Audio state
  const audioCtx: AudioContext = new window.AudioContext();
  let audioBuf: AudioBuffer | null = null;
  let sourceNode: AudioBufferSourceNode | null = null;
  let micSourceNode: MediaStreamAudioSourceNode | null = null;
  let scriptNode: ScriptProcessorNode | null = null;
  let isPlaying: boolean = false;
  let isMicActive: boolean = false;

  // FPS measurement
  let frameCount = 0;
  let lastTime = performance.now();
  const fpsDisplay = document.getElementById("fps-display");

  const updateFPS = () => {
    const now = performance.now();
    frameCount++;
    if (now - lastTime >= 1000) {
      const fps = Math.round((frameCount * 1000) / (now - lastTime));
      if (fpsDisplay) fpsDisplay.textContent = `FPS: ${fps}`;
      frameCount = 0;
      lastTime = now;
    }
  };

  // Canvas state
  const offscreen = canvas.transferControlToOffscreen();

  renderer.postMessage(
    {
      type: "init-renderer",
      wasmMemory,
      bridgeBuf,
      canvas: offscreen,
    } as WorkerMessage,
    [offscreen],
  );

  // Initialize analyzer immediately to load Wasm (even without a buffer)
  analyzer.postMessage({
    type: "init-analyzer",
    wasmMemory,
    bridgeBuf,
    sampleRate: audioCtx.sampleRate,
    fftSize: options.fftSize || AUDIO_CONFIG.DEFAULT_FFT_SIZE,
  } as WorkerMessage);

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
      bridgeBuf,
      sampleRate: audioBuf.sampleRate,
      fftSize: options.fftSize || AUDIO_CONFIG.DEFAULT_FFT_SIZE,
    } as WorkerMessage);
  };

  const play = () => {
    if (!audioBuf) return;
    const startTime = audioCtx.currentTime;

    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuf;
    sourceNode.connect(audioCtx.destination);

    sourceNode.onended = () => (isPlaying = false);
    sourceNode.start();
    isPlaying = true;

    const tick = () => {
      if (!isPlaying) return;

      updateFPS();

      const relativeTime = audioCtx.currentTime - startTime;
      analyzer.postMessage({
        type: "analyze",
        time: relativeTime,
      } as WorkerMessage);

      renderer.postMessage({ type: "draw" } as WorkerMessage);

      requestAnimationFrame(tick);
    };
    tick();
  };

  const startMic = async () => {
    if (isMicActive) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      micSourceNode = audioCtx.createMediaStreamSource(stream);
      const fftSize = options.fftSize || AUDIO_CONFIG.DEFAULT_FFT_SIZE;
      scriptNode = audioCtx.createScriptProcessor(fftSize, 1, 1);

      micSourceNode.connect(scriptNode);
      scriptNode.connect(audioCtx.destination); // Required for process to trigger

      scriptNode.onaudioprocess = (e) => {
        if (!isMicActive) return;
        updateFPS();
        const samples = e.inputBuffer.getChannelData(0);
        analyzer.postMessage({
          type: "analyze-realtime",
          samples: new Float32Array(samples),
          time: audioCtx.currentTime,
        } as WorkerMessage);
        renderer.postMessage({ type: "draw" } as WorkerMessage);
      };

      isMicActive = true;
      micBtn.textContent = "Stop Mic";
      playBtn.disabled = true;
    } catch (err) {
      alert("Microphone access is required for this feature.");
    }
  };

  const stopMic = () => {
    if (!isMicActive) return;
    micSourceNode?.disconnect();
    scriptNode?.disconnect();
    micSourceNode = null;
    scriptNode = null;
    isMicActive = false;
    micBtn.textContent = "Start Mic";
    playBtn.disabled = false;
  };

  // Event Listeners
  uploadInput?.addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) setup(await file.arrayBuffer());
  });

  playBtn.addEventListener("click", () => {
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    if (isPlaying) {
      sourceNode?.stop();
      isPlaying = false;
      playBtn.textContent = "Play";
      micBtn.disabled = false;
    } else if (audioBuf) {
      play();
      playBtn.textContent = "Pause";
      micBtn.disabled = true;
    }
  });

  micBtn.addEventListener("click", () => {
    if (isMicActive) {
      stopMic();
    } else {
      startMic();
    }
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
