import { generatePassword } from "../../utils";
import config from "../../config";

export function useOrchestrator() {
  // state
  let targetPass = "";
  let targetHash: Uint8Array;
  const workers = new Map<string, number[]>(); // Map socketIDs to Job indices
  const pendingJobs = new Set<number>(); // Holds high priority requeued jobs
  const completedJobs = new Set<number>();

  // Cursor for pendingJobs
  let nextJobIndex = 0;
  let totalBatches = 0;
  let isSolved = false;

  function init() {
    isSolved = false;
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

  function reset() {
    targetPass = '';
    workers.clear();
    pendingJobs.clear();
    completedJobs.clear();
    nextJobIndex = 0;
    totalBatches = 0;
    isSolved = true;
  }

  function registerWorker(socketID: string) {
    console.log(`[Orchestrator] Worker connected: ${socketID}`);
    workers.set(socketID, []);
  }

  function getTargetHash() {
    return targetHash;
  }

  function removeWorker(socketID: string) {
    const jobs = workers.get(socketID);
    if (jobs) {
      for (const job of jobs) {
        console.log(
          `[Orchestrator] Worker ${socketID} has disconnected. Requeueing Job #${job}`,
        );
        pendingJobs.add(job);
      }
    }
    workers.delete(socketID);
  }

  function completeJob(socketID: string) {
    const jobs = workers.get(socketID);
    if (jobs && jobs.length > 0) {
      const job = jobs.shift();
      if (job !== undefined) {
        completedJobs.add(job);
      }
    }
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

    let jobIndex = -1;
    const recycled = pendingJobs.values().next().value;
    if (recycled !== undefined) {
      pendingJobs.delete(recycled);
      jobIndex = recycled;
    } else if (nextJobIndex < totalBatches) {
      jobIndex = nextJobIndex++;
    }

    if (jobIndex !== -1) {
      const userJobs = workers.get(socketID);
      if (userJobs) {
        userJobs.push(jobIndex);
      }
      return jobIndex;
    }

    return -1; // No new jobs
  }

  function getProgress() {
    return {
      completed: completedJobs.size,
      total: totalBatches,
    };
  }

  return {
    getTargetHash,
    init,
    reset,
    registerWorker,
    removeWorker,
    getJob,
    completeJob,
    validateSolution,
    getProgress,
  };
}

export type Orchestrator = ReturnType<typeof useOrchestrator>;
