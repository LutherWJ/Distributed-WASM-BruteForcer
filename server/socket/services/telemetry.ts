import type { TelemetryData, GlobalTelemetry, WorkerStats } from "../../types.ts";

export function useTelemetry() {
  const workers = new Map<string, { name: string; hps: number; numHashes: number }>();
  let retiredHashes = 0;

  function registerWorker(socketID: string) {
    workers.set(socketID, { name: "Anonymous", hps: 0, numHashes: 0 });
  }

  function update(socketID: string, data: TelemetryData) {
    workers.set(socketID, {
      name: data.name,
      hps: data.hps,
      numHashes: data.numHashes,
    });
  }

  function removeWorker(socketID: string) {
    const stats = workers.get(socketID);
    if (stats) {
      retiredHashes += stats.numHashes;
      workers.delete(socketID);
    }
  }

  function getGlobalStats(progress: { completed: number; total: number }): GlobalTelemetry {
    let totalHps = 0;
    let totalHashes = retiredHashes;
    const workerList: WorkerStats[] = [];

    for (const [id, stats] of workers.entries()) {
      totalHps += stats.hps;
      totalHashes += stats.numHashes;
      workerList.push({
        id,
        name: stats.name,
        hps: stats.hps,
        numHashes: stats.numHashes,
      });
    }

    // Sort workers by contribution (total hashes) for leaderboard
    workerList.sort((a, b) => b.numHashes - a.numHashes);

    return {
      totalHps,
      totalHashes,
      workers: workerList,
      progress,
    };
  }

  function reset() {
    retiredHashes = 0;
    for (const [id, stats] of workers.entries()) {
      workers.set(id, { name: stats.name, hps: 0, numHashes: 0 });
    }
  }

  return {
    registerWorker,
    removeWorker,
    update,
    getGlobalStats,
    reset,
  };
}

export type Telemetry = ReturnType<typeof useTelemetry>;
