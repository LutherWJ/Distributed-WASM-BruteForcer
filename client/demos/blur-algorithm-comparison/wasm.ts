export interface WasmInstance {
    exports: {
        alloc?: (len: number) => number;
        free?: (ptr: number, len: number) => void;
        blur?: (inputPtr: number, outputPtr: number, width: number, height: number, radius: number) => void;
        memory?: WebAssembly.Memory;
        [key: string]: any;
    };
}

export interface WasmContext {
    instance: WebAssembly.Instance;
    memory: WebAssembly.Memory;
}

export const PAGE_SIZE = 65536;

export function bytesToPages(bytes: number): number {
    return Math.ceil(bytes / PAGE_SIZE);
}

export async function initWasm(
    wasmUrl: string,
    minBytes: number,
    maxBytes?: number
): Promise<WasmContext> {
    const initialPages = bytesToPages(minBytes);
    const maxPages = maxBytes ? bytesToPages(maxBytes) : initialPages;

    const memory = new WebAssembly.Memory({
        initial: initialPages,
        maximum: maxPages,
        shared: true,
    });

    const importObject = {
        env: {
            memory: memory,
        },
    };

    const response = await fetch(wasmUrl);
    const buffer = await response.arrayBuffer();
    const wasm = await WebAssembly.instantiate(buffer, importObject);

    return {
        instance: wasm.instance,
        memory,
    };
}
