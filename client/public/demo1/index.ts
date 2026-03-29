// DOM references
const runButton = document.getElementById("run-benchmark") as HTMLButtonElement;
const radiusSlider = document.getElementById("blur-radius") as HTMLInputElement;
const radiusValue = document.getElementById("radius-value")!;

// Canvases
const sourceCanvas = document.getElementById(
  "source-canvas",
) as HTMLCanvasElement;
const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true })!;
const jsCanvas = document.getElementById("js-canvas") as HTMLCanvasElement;
const jsCtx = jsCanvas.getContext("2d")!;
const wasmCanvas = document.getElementById("wasm-canvas") as HTMLCanvasElement;
const wasmCtx = wasmCanvas.getContext("2d")!;

// Stats
const jsStats = document.getElementById("js-stats")!;
const wasmStats = document.getElementById("wasm-stats")!;

// Workers
const jsWorker = new Worker("./worker.js", { type: "module" });
const wasmWorker = new Worker("./wasmWorker.js", { type: "module" });

// Setup workers error handling
const handleWorkerError =
  (workerName: string, element: HTMLElement) => (err: ErrorEvent) => {
    console.error(`${workerName} error:`, err);
    element.textContent = "Error";
    element.style.color = "red";
  };
jsWorker.onerror = handleWorkerError("JS Worker", jsStats);
wasmWorker.onerror = handleWorkerError("WASM Worker", wasmStats);


// Initialize wasm Module
const bytesToPages = (bytes: number): number => {
    const page_size = 0x10000;
    return Math.ceil(bytes / page_size);
}

let wasmIsReady = false;
const wasmMemory = new WebAssembly.Memory({
    initial: bytesToPages(4 * 1024 * 1024),
    maximum: bytesToPages(100 * 1024 * 1024),
    shared: true,
});

const initWasm = () => {
    return new Promise<void>((resolve) => {
        const handleInit = (e: MessageEvent) => {
            if (e.data.type === "ready") {
                wasmIsReady = true;
                wasmWorker.removeEventListener("message", handleInit);
                resolve();
            }
        };
        wasmWorker.addEventListener("message", handleInit);
        wasmWorker.postMessage({ type: "init", memory: wasmMemory });
    });
};

const wasmInitPromise = initWasm();

// Update slider value
radiusSlider.addEventListener("input", () => {
  radiusValue.textContent = radiusSlider.value;
});

// Load static image
const img = new Image();
img.onload = () => {
  sourceCanvas.width = img.width;
  sourceCanvas.height = img.height;
  sourceCtx.drawImage(img, 0, 0);

  jsCanvas.width = img.width;
  jsCanvas.height = img.height;
  jsCtx.clearRect(0, 0, img.width, img.height);

  wasmCanvas.width = img.width;
  wasmCanvas.height = img.height;
  wasmCtx.clearRect(0, 0, img.width, img.height);

  jsStats.textContent = "Ready";
  wasmStats.textContent = "Ready";
};
img.src = "demo1.jpg";

const runBenchmark = async () => {
  if (sourceCanvas.width === 0) {
    alert("Image not loaded yet.");
    return;
  }

  if (!crossOriginIsolated) {
    alert(
      "Error: crossOriginIsolated is false. SharedArrayBuffer requires specific headers.",
    );
    return;
  }

  await wasmInitPromise;

  runButton.disabled = true;
  runButton.textContent = "Running...";
  jsStats.textContent = "Running...";
  wasmStats.textContent = "Running...";

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const radius = parseInt(radiusSlider.value, 10);
  const size = width * height * 4;

  const imageData = sourceCtx.getImageData(0, 0, width, height);

  // JS Buffers
  const jsInputBuffer = new SharedArrayBuffer(size);
  new Uint8ClampedArray(jsInputBuffer).set(imageData.data);
  const jsOutputBuffer = new SharedArrayBuffer(size);

  // WASM zero-copy setup
  const requiredMemory = size * 2;
  if (wasmMemory.buffer.byteLength < requiredMemory) {
      const extraPages = bytesToPages(requiredMemory - wasmMemory.buffer.byteLength);
      wasmMemory.grow(extraPages);
  }
  
  const wasmInputView = new Uint8ClampedArray(wasmMemory.buffer, 0, size);
  wasmInputView.set(imageData.data);

  const runWorker = (
    worker: Worker,
    runtime: "js" | "wasm",
    outBuffer: SharedArrayBuffer | ArrayBuffer,
    ctx: CanvasRenderingContext2D,
    statEl: HTMLElement,
  ): Promise<void> => {
    return new Promise((resolve) => {
      const start = performance.now();

      const handleMessage = (e: MessageEvent) => {
        if (e.data.result === "done") {
          const durationNum = e.data.duration; // Use worker-side duration
          const durationStr = durationNum.toFixed(1);

          // Calculate MP/s
          const pixels = width * height;
          const seconds = durationNum / 1000;
          const mps =
            seconds > 0 ? (pixels / seconds / 1_000_000).toFixed(2) : "N/A";

          // Render Result
          let sharedResultView: Uint8ClampedArray;
          if (runtime === "wasm") {
              const outputOffset = size;
              sharedResultView = new Uint8ClampedArray(outBuffer, outputOffset, size);
          } else {
              sharedResultView = new Uint8ClampedArray(outBuffer);
          }

          // ImageData does NOT support SharedArrayBuffer, so we must perform one copy here
          const nonSharedArray = new Uint8ClampedArray(sharedResultView);
          const resultImageData = new ImageData(
            nonSharedArray,
            width,
            height,
          );
          ctx.putImageData(resultImageData, 0, 0);

          statEl.innerHTML = `${durationStr}ms<br><span style="font-size:0.9em; color:#666;">${mps} MP/s</span>`;
          statEl.style.color = "#006600"; // dark green

          worker.removeEventListener("message", handleMessage);
          resolve();
        } else if (e.data.error) {
          statEl.textContent = `Error: ${e.data.error}`;
          statEl.style.color = "red";
          worker.removeEventListener("message", handleMessage);
          resolve(); // Resolve anyway to not hang the group
        }
      };

      worker.addEventListener("message", handleMessage);

      if (runtime === "wasm") {
          worker.postMessage({
              runtime,
              inputOffset: 0,
              outputOffset: size,
              width,
              height,
              radius,
          });
      } else {
          worker.postMessage({
            runtime,
            inputBuffer: jsInputBuffer,
            outputBuffer: outBuffer,
            width,
            height,
            radius,
          });
      }
    });
  };

  // Execute in Parallel
  await Promise.all([
    runWorker(jsWorker, "js", jsOutputBuffer, jsCtx, jsStats),
    runWorker(wasmWorker, "wasm", wasmMemory.buffer, wasmCtx, wasmStats),
  ]);


  runButton.disabled = false;
  runButton.textContent = "Run Comparison";
};

runButton.addEventListener("click", runBenchmark);

