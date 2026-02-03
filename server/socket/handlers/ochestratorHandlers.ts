import type { Socket } from "socket.io";
import config from "../../config";
import type { Orchestrator } from "../services/orchestrator";
import type { Job } from "../../types";

export function handleJobCompletion(
  socket: Socket,
  orchestrator: Orchestrator,
) {
  orchestrator.completeJob(socket.id);

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

export function handleSolution(
  socket: Socket,
  orchestrator: Orchestrator,
  password: string,
) {
  const isValid = orchestrator.validateSolution(password);
  if (!isValid) return;
  socket.emit("found", password);
}
