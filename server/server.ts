import express from "express";
import { Server as SocketIOServer } from "socket.io";
import { createServer } from "https";
import { Server as Engine } from "socket.io-bun";
import * as path from "node:path";
import { initSocket } from "./socket";
import { readFileSync } from "fs";

const app = express();
const port = 8080;

// Create HTTPS server
const options = {
  cert: readFileSync("../certs/server.crt"),
  key: readFileSync("../certs/server.key"),
};

const httpServer = createServer(options, app);

const io = new SocketIOServer(httpServer);
const engine = new Engine();
io.bind(engine);

initSocket(io);

// Enable Cross-Origin Isolation for SharedArrayBuffer support
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

const index = path.resolve(__dirname, "./../client/public");
app.use("/", express.static(index));

httpServer.listen(port, () => {
  console.log(`Server running on https://localhost:${port}`);
});
