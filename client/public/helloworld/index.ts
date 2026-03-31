// Constants and type definitions
const PAGE_SIZE = 0x10000; // 64KiB

type WasmContext = {
    instance: WebAssembly.Instance,
    memory: WebAssembly.Memory,
}

// Helper to convert byte values to WASM pages.
function bytesToPages(bytes: number): number {
    return Math.ceil(bytes / PAGE_SIZE);
}

async function initWasm(urlToWasmFile: string): Promise<WasmContext> {
    // Initialize the memory available to the WASM environment.
    const initMem = 17 * 64 * 1024; // 1.1MiB (17 pages)
    const maxMem = 2 * 1024 * 1024; // 2MiB

    const wasmMemory = new WebAssembly.Memory({
        initial: bytesToPages(initMem),
        maximum: bytesToPages(maxMem),
        // shared: true,
    });

    // Create the import object with the memory we initialized
    // There are a variety of things we can import but this is 
    // the bare minimum.
    const importObject = {
        env: {
            memory: wasmMemory,
        }
    }

    // Request the wasm file from the server.
    // Note: we do not need to unwrap the promise,
    // WebAssembly.instantiateStreaming handles this automatically
    const wasmFile = fetch(urlToWasmFile);
    const wasm= await WebAssembly.instantiateStreaming(wasmFile, importObject);

    // Return the created instance bundled with the memory.
    return {
        instance: wasm.instance,
        memory: wasmMemory,
    }
}

(async () => {
    // Initialize the WASM environment 
    const url = "main.wasm";
    const ctx = await initWasm(url);

    // Run the hello world function
    const length = ctx.instance.exports.hello();

    // Get the memory address of the output
    const address = ctx.instance.exports.getOutAddress();

    // Create a "view" into the memory.
    // Uint8ClampedArray is a simple wrapper object that
    // gives us helpful methods for reading the memory.
    const memView = new Uint8ClampedArray(ctx.memory.buffer);

   // Read the output from memory.
    const buf = memView.slice(address, address + length);
    console.log(`Raw bytes: ${buf}`);

    // Decode buffer into text
    const decoder = new TextDecoder("utf-8");
    const str = decoder.decode(buf);
    console.log(str);
})();
