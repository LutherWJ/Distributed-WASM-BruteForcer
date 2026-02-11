import { type WorkerData } from "./types.ts";

// DOM references
const fileInput = document.getElementById('image-upload') as HTMLInputElement;
const runButton = document.getElementById('run-benchmark') as HTMLButtonElement;
const radiusSlider = document.getElementById('blur-radius') as HTMLInputElement;
const radiusValue = document.getElementById('radius-value')!;

// Canvases
const sourceCanvas = document.getElementById('source-canvas') as HTMLCanvasElement;
const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true })!;
const jsCanvas = document.getElementById('js-canvas') as HTMLCanvasElement;
const jsCtx = jsCanvas.getContext('2d')!;
const wasmCanvas = document.getElementById('wasm-canvas') as HTMLCanvasElement;
const wasmCtx = wasmCanvas.getContext('2d')!;

// Stats
const jsStats = document.getElementById('js-stats')!;
const wasmStats = document.getElementById('wasm-stats')!;

// Workers
const jsWorker = new Worker("./worker.js");
const wasmWorker = new Worker("./worker.js");

// Setup workers error handling
const handleWorkerError = (workerName: string, element: HTMLElement) => (err: ErrorEvent) => {
    console.error(`${workerName} error:`, err);
    element.textContent = "Error";
    element.style.color = "red";
};
jsWorker.onerror = handleWorkerError("JS Worker", jsStats);
wasmWorker.onerror = handleWorkerError("WASM Worker", wasmStats);

// Update slider value
radiusSlider.addEventListener('input', () => {
  radiusValue.textContent = radiusSlider.value;
});

// Handle Image Upload
fileInput.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const img = new Image();
  const url = URL.createObjectURL(file);

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
    
    URL.revokeObjectURL(url);
  };
  img.src = url;
});

const runBenchmark = async () => {
    if (sourceCanvas.width === 0) {
        alert("Please upload an image first.");
        return;
    }
    
    if (!crossOriginIsolated) {
        alert("Error: crossOriginIsolated is false. SharedArrayBuffer requires specific headers.");
        return;
    }

    runButton.disabled = true;
    runButton.textContent = "Running...";
    jsStats.textContent = "Running...";
    wasmStats.textContent = "Running...";

    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const radius = parseInt(radiusSlider.value, 10);
    const size = width * height * 4;

    const imageData = sourceCtx.getImageData(0, 0, width, height);
    
    const inputBuffer = new SharedArrayBuffer(size);
    new Uint8ClampedArray(inputBuffer).set(imageData.data);

    const jsOutputBuffer = new SharedArrayBuffer(size);
    const wasmOutputBuffer = new SharedArrayBuffer(size);

    const runWorker = (
        worker: Worker, 
        runtime: 'js' | 'wasm', 
        outBuffer: SharedArrayBuffer, 
        ctx: CanvasRenderingContext2D,
        statEl: HTMLElement
    ): Promise<void> => {
        return new Promise((resolve) => {
            const start = performance.now();
            
            const handleMessage = (e: MessageEvent) => {
                if (e.data.result === 'done') {
                    const end = performance.now();
                    const durationNum = end - start;
                    const durationStr = durationNum.toFixed(0);
                    
                    // Calculate MP/s
                    const pixels = width * height;
                    const seconds = durationNum / 1000;
                    const mps = (seconds > 0) ? (pixels / seconds / 1_000_000).toFixed(2) : "N/A";

                    // Render Result
                    const resultData = new Uint8ClampedArray(outBuffer);
                    const resultImageData = new ImageData(new Uint8ClampedArray(resultData), width, height);
                    ctx.putImageData(resultImageData, 0, 0);
                    
                    statEl.innerHTML = `${durationStr}ms<br><span style="font-size:0.9em; color:#666;">${mps} MP/s</span>`;
                    statEl.style.color = "#006600"; // dark green
                    
                    worker.removeEventListener('message', handleMessage);
                    resolve();
                } else if (e.data.error) {
                    statEl.textContent = `Error: ${e.data.error}`;
                    statEl.style.color = "red";
                    worker.removeEventListener('message', handleMessage);
                    resolve(); // Resolve anyway to not hang the group
                }
            };

            worker.addEventListener('message', handleMessage);
            
            const msg: WorkerData = {
                runtime,
                inputBuffer,
                outputBuffer: outBuffer,
                width,
                height,
                radius
            };
            worker.postMessage(msg);
        });
    };

    // Execute in Parallel
    await Promise.all([
        runWorker(jsWorker, 'js', jsOutputBuffer, jsCtx, jsStats),
        runWorker(wasmWorker, 'wasm', wasmOutputBuffer, wasmCtx, wasmStats)
    ]);

    runButton.disabled = false;
    runButton.textContent = "Run Comparison";
};

runButton.addEventListener('click', runBenchmark);