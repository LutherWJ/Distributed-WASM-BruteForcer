import { jsBlur as blurImage } from "./blur.ts";
import { initWasm, type WasmContext } from "./wasm.ts";

const isWorkerData = (data: any): boolean => {
    return (
        typeof data === 'object' &&
        data !== null &&
        (data.runtime === 'js' || data.runtime === 'wasm') &&
        data.inputBuffer instanceof SharedArrayBuffer &&
        data.outputBuffer instanceof SharedArrayBuffer &&
        typeof data.width === 'number' &&
        typeof data.height === 'number' &&
        typeof data.radius === 'number'
    );
}

// Pre-initialize WASM
// Start with a reasonable default to minimize initial delay and grow as needed
const INITIAL_BYTES = 4 * 1024 * 1024;
const MAX_BYTES = 4294967296; // 4GB
let wasmInitPromise: Promise<WasmContext>;

try {
    console.log("Worker: Initializing Wasm...");
    wasmInitPromise = initWasm('./main.wasm', INITIAL_BYTES, MAX_BYTES);
    wasmInitPromise.catch(err => {
        console.error("Worker: Wasm init failed eagerly:", err);
    });
} catch (e) {
    console.error("Worker: Synchronous setup error:", e);
    throw e;
}

let wasmCtx: WasmContext | null = await wasmInitPromise;

self.onmessage = async (e: MessageEvent) => {
    const params = e.data;
    if (!isWorkerData(params)) {
        self.postMessage({ error: 'Invalid parameters'})
        return;
    }

    try {
        const inputView = new Uint8ClampedArray(params.inputBuffer);
        const outputView = new Uint8ClampedArray(params.outputBuffer);

        switch (params.runtime) {
            case 'js': 
                blurImage(inputView, outputView, params.width, params.height, params.radius); 
                self.postMessage({ result: 'done' });
                break;
            case 'wasm': 
                if (!wasmCtx) {
                    try {
                        wasmCtx = await wasmInitPromise;
                    } catch (initErr) {
                         throw new Error(`Wasm initialization failed: ${initErr}`);
                    }
                }

                const len = params.width * params.height * 4;
                const totalBytes = len * 2; 
                
                // Grow memory if needed
                if (wasmCtx.memory.buffer.byteLength < totalBytes) {
                    const currentBytes = wasmCtx.memory.buffer.byteLength;
                    const missingBytes = totalBytes - currentBytes;
                    const PAGE_SIZE = 65536;
                    const pagesNeeded = Math.ceil(missingBytes / PAGE_SIZE);
                    console.log(`Worker: Growing memory by ${pagesNeeded} pages`);
                    wasmCtx.memory.grow(pagesNeeded);
                }
                
                const wasmMemoryU8 = new Uint8Array(wasmCtx.memory.buffer);
                wasmMemoryU8.set(inputView, 0);
                
                if (wasmCtx.instance.exports.blur) {
                     (wasmCtx.instance.exports.blur as any)(0, len, params.width, params.height, params.radius);
                } else {
                    throw new Error("Wasm module does not export 'blur'");
                }

                const resultSlice = wasmMemoryU8.subarray(len, len + len);
                outputView.set(resultSlice);
                
                self.postMessage({ result: 'done' });
                break;
            default: 
                throw new Error('Invalid Parameters');
        }
    } catch (err) {
        self.postMessage({error: err instanceof Error ? err.message : String(err)});
    }
}