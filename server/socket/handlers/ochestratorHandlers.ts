import type { Socket, Server as SocketIOServer } from "socket.io";
import config from "../../config";
import type { Orchestrator } from "../services/orchestrator";
import type { Job } from "../../types";

export function assignJob(socket: Socket, orchestrator: Orchestrator) {
  const index = orchestrator.getJob(socket.id);
  if (index === -1) {
    return;
  }

  const job: Job = {
    index: index * config.jobSize,
    size: config.jobSize,
    length: config.passwordLength,
    charset: config.charset,
    target: orchestrator.getTargetHash(),
  };

  socket.emit("job", job);
}

export function assignJobs(io: SocketIOServer, orchestrator: Orchestrator) {
  io.sockets.sockets.forEach((socket) => {
    assignJob(socket, orchestrator);
  });
}

export function handleJobCompletion(
  socket: Socket,
  orchestrator: Orchestrator,
) {
  orchestrator.completeJob(socket.id);
  assignJob(socket, orchestrator);
}

import { type Telemetry } from "../services/telemetry";

export function handleSolution(
  io: SocketIOServer,
  socket: Socket,
  orchestrator: Orchestrator,
  telemetry: Telemetry,
  password: string,
) {
  const isValid = orchestrator.validateSolution(password);
  if (!isValid) return;

  const stats = telemetry.getGlobalStats({ completed: 0, total: 0 });
  const winner = stats.workers.find(w => w.id === socket.id)?.name || "Unknown";

  io.emit("solution-found", {
    password,
    winner,
  });
}
