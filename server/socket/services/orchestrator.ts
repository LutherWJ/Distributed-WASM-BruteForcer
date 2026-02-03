import { generatePassword } from "../../utils";
import config from "../../config";

export function useOrchestrator() {
  // state
  let targetPass = "";
  let targetHash: Uint8Array;
  const workers = new Map<string, number>(); // Map socketIDs to Job index
  const pendingJobs = new Set<number>(); // Holds high priority requeued jobs
  const completedJobs = new Set<number>();

  // Cursor for pendingJobs
  let nextJobIndex = 0;
  let totalBatches = 0;
  let isSolved = false;

  function init() {
    targetPass = generatePassword(config.passwordLength);
    targetHash = new Bun.CryptoHasher("sha256").update(targetPass).digest();
    console.log(`[Orchestrator] Target Password: ${targetPass}`);
    console.log(`[Orchestrator] Target Hash: ${targetHash}`);

    const possibilities = Math.pow(
      config.charset.length,
      config.passwordLength,
    );
    totalBatches = Math.ceil(possibilities / config.jobSize);

    console.log(`[Orchestrator] Search space: ${possibilities} combinations`);
    console.log(`[Orchestrator] Total batches: ${totalBatches}`);
  }

  function registerWorker(socketID: string) {
    console.log(`[Orchestrator] Worker connected: ${socketID}`);
    workers.set(socketID, -1);
  }

  function getTargetHash() {
    return targetHash;
  }

  function removeWorker(socketID: string) {
    const job = workers.get(socketID);
    console.log(
      `[Orchestrator] Worker ${socketID} has disconnected. Requeueing Job #${job}`,
    );
    if (job) {
      pendingJobs.add(job);
    }
    workers.delete(socketID);
  }

  function completeJob(socketID: string) {
    const job = workers.get(socketID);
    if (job) {
      completedJobs.add(job);
    }
    workers.delete(socketID);
  }

  function validateSolution(password: string): boolean {
    if (password === targetPass) {
      isSolved = true;
      console.log(`[Orchestrator] PASSWORD FOUND: ${password}`);
      return true;
    }
    return false;
  }

  // Returns a job index to be assigned
  // Returns -1 if there is no new job.
  function getJob(socketID: string): number {
    if (isSolved) return -1;

    const recycled = pendingJobs.values().next().value;
    if (recycled !== undefined) {
      pendingJobs.delete(recycled);
      return recycled;
    }

    if (nextJobIndex < totalBatches) {
      const job = nextJobIndex++;
      workers.set(socketID, job);
      return job;
    }

    return -1; // No new jobs
  }

  return {
    getTargetHash,
    init,
    registerWorker,
    removeWorker,
    getJob,
    completeJob,
    validateSolution,
  };
}

export type Orchestrator = ReturnType<typeof useOrchestrator>;
