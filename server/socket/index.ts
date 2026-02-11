import { Socket, Server as SocketIOServer } from "socket.io";
import { useOrchestrator } from "./services/orchestrator";
import type { Orchestrator } from "./services/orchestrator";
import {
  handleJobCompletion,
  handleSolution,
  assignJob,
  assignJobs,
} from "./handlers/ochestratorHandlers";
import type { TelemetryData, Job } from "../types.ts";
import { type Telemetry, useTelemetry } from "./services/telemetry.ts";
import config from "../config";

export function initSocket(io: SocketIOServer) {
  const orchestrator: Orchestrator = useOrchestrator();
  const telemetry: Telemetry = useTelemetry();

  // Broadcast global stats to everyone every second
  setInterval(() => {
    io.emit("stats-update", telemetry.getGlobalStats(orchestrator.getProgress()));
  }, 1000);

  io.on("connection", (socket: Socket) => {
    console.log(`[SOCKET] connection from ${socket.id}`);
    orchestrator.registerWorker(socket.id);
    telemetry.registerWorker(socket.id);

    socket.on("ready", () => {
      assignJob(socket, orchestrator);
    });

    socket.on("job-completed", () => {
      handleJobCompletion(socket, orchestrator);
    });

    socket.on("found", (password) => {
      handleSolution(io, socket, orchestrator, telemetry, password);
    });

    socket.on("status-report", (data: TelemetryData) => {
      telemetry.update(socket.id, data);
    });

    socket.on("disconnect", () => {
      orchestrator.removeWorker(socket.id);
      telemetry.removeWorker(socket.id);
    });

    // Admin specific actions (totally secure)
    socket.on("start", () => {
      orchestrator.init();
      telemetry.reset();
      assignJobs(io, orchestrator);
      socket.emit("started");
    });

    socket.on("stop", () => {
      orchestrator.reset();
      telemetry.reset();
      socket.emit("stopped");
    });
  });
}

