import express from "express";
import {Server as SocketIOServer} from "socket.io";
import { createServer } from "http";
import {Server as Engine} from 'socket.io-bun'
import * as path from "node:path";
import { initSocket } from "./socket";


const app = express();
const port = 8080;

const httpServer = createServer(app);

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
  console.log(`Server running on port ${port}`);
});
