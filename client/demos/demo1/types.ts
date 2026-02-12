
export type Runtime = 'js' | 'wasm';

export type WorkerData = {
    runtime: Runtime;
    inputBuffer: SharedArrayBuffer;
    outputBuffer: SharedArrayBuffer;
    width: number;
    height: number;
    radius: number;
}