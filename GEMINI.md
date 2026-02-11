# Project Overview: WasmDemo2

`WasmDemo2` is a distributed SHA-256 password cracking application designed to demonstrate high-performance computing in the browser. It uses a Bun-based server to orchestrate work across multiple browser clients, each utilizing Web Workers and Zig-compiled WebAssembly (Wasm) for parallelized hash searching.

## Architecture

### Server (`server/`)
- **Runtime:** [Bun](https://bun.sh)
- **Frameworks:** Express (HTTP), Socket.io (Real-time communication).
- **Orchestration:**
    - Generates a random target password and its SHA-256 hash on startup.
    - Divides the search space (defined by `charset` and `passwordLength`) into batches of `jobSize`.
    - Distributes these "jobs" to connected clients via Socket.io.
    - Tracks worker status and re-queues jobs if a client disconnects.
    - Collects and broadcasts real-time telemetry (Hashes Per Second, Total Hashes).

### Client (`client/`)
- **Technology:** TypeScript, Bun (Bundler), Web Workers, WebAssembly.
- **Concurrency:** Spawns a pool of Web Workers equal to `navigator.hardwareConcurrency`.
- **Worker Management:**
    - Each Worker initializes a dedicated Zig/Wasm instance.
    - Communicates with the Main thread via `postMessage` for job assignment and result reporting.
    - Uses `SharedArrayBuffer` to provide the Main thread with direct, low-latency access to the `attempts` counter in Wasm memory.

### Wasm (`client/zig/`)
- **Language:** [Zig](https://ziglang.org)
- **Logic:** Implements the core SHA-256 hashing and comparison loop using Zig's standard library (`std.crypto.hash.sha2.Sha256`).
- **Memory:** Managed via exported pointers, allowing the JS side to read/write search targets and results directly.

## Building and Running

### Prerequisites
- [Bun](https://bun.sh) installed.
- [Zig](https://ziglang.org) installed (for building Wasm).

### Installation
Run the following in the project root (and potentially in `client/` and `server/` if `bun install` at root doesn't propagate):
```bash
bun install
```

### Building the Client
To compile the Zig code to Wasm and bundle the TypeScript client:
```bash
cd client
bun run build
```
This populates the `client/public/` directory with `index.html`, `index.js`, `worker.js`, and `main.wasm`.

### Running the Server
```bash
cd server
bun run server.ts
```
The server will be available at `http://localhost:8080`. It serves the static client files from `client/public/`.

## Development Conventions

- **Cross-Origin Isolation:** The server must set `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers to enable `SharedArrayBuffer`.
- **Typing:** Shared types are defined in `types.ts` files within both `client/` and `server/`.
- **Performance:** High-frequency updates (like attempt counts) should avoid `postMessage` overhead and use `SharedArrayBuffer`/`Atomics` where possible.
- **Service Pattern:** The server logic is organized into functional services (e.g., `useOrchestrator`, `useTelemetry`) found in `server/socket/services/`.
