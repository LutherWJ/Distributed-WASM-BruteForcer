# Project Overview: WasmDemos

`WasmDemos` is a collection of high-performance computing demonstrations using Zig-compiled WebAssembly (Wasm), Web Workers, and Bun. The project showcases the power of Wasm in scenarios like image processing, distributed computing, and real-time audio analysis.

## Architecture

The project is structured as a monorepo with a separate client and server.

### Client (`client/`)
- **Technology:** TypeScript, Bun (Bundler), Web Workers, WebAssembly (Zig).
- **Structure:**
    - `demos/`: Contains individual demonstration projects.
    - `public/`: Output directory for the build process, served by the server.
- **Key Demos:**
    - `demo1/` (Blur Comparison): Compares a Box Blur algorithm implemented in both JavaScript and Zig/Wasm using `SharedArrayBuffer` for zero-copy data sharing.
    - `demo2/` (Distributed Password Cracker): A distributed SHA-256 cracker that coordinates work across multiple browser clients via Socket.io.
    - `demo3/` (Audio Visualizer): Real-time audio visualization using FFT (Fast Fourier Transform) implemented in Zig/Wasm.
    - `admin/`: A simple dashboard to control the distributed cracker (start/stop jobs).

### Server (`server/`)
- **Runtime:** [Bun](https://bun.sh)
- **Frameworks:** Express (HTTP), Socket.io (Real-time orchestration).
- **Responsibilities:**
    - Serves static files from `client/public`.
    - Manages the search space for the distributed password cracker.
    - Broadcasts real-time telemetry (hashes/sec, progress) to all connected clients.
    - Ensures `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers are set to enable `SharedArrayBuffer`.

## Building and Running

### Prerequisites
- [Bun](https://bun.sh)
- [Zig](https://ziglang.org) (v0.13.0 or compatible)

### Installation
Run the following in the project root:
```bash
bun install
```

### Building the Project
The project uses a custom build script that compiles Zig to Wasm and bundles TypeScript for the browser.
```bash
cd client
bun run build
```
This will populate `client/public/` with the compiled assets for all demos.

### Running the Server
The server requires SSL certificates in the `certs/` directory (`server.crt` and `server.key`).
```bash
cd server
bun run server.ts
```
The application will be available at `https://localhost:8080`.

## Development Conventions

- **Wasm Interop:** Prefer `SharedArrayBuffer` and `Atomics` for high-frequency data exchange between the main thread, workers, and Wasm memory.
- **Zig:** Core performance logic is implemented in Zig. Each demo with Wasm has a `zig/` directory containing `main.zig` and `build.zig`.
- **Typing:** Shared types between client and server (especially for Socket.io events) are defined in `types.ts` files.
- **Service Pattern:** Server-side logic is encapsulated in "services" (e.g., `orchestrator.ts`, `telemetry.ts`) located in `server/socket/services/`.
