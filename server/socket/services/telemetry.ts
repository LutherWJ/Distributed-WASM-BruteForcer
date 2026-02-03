import type { TelemetryData } from "../../types.ts";

export function useTelemetry() {
  const workers = new Map<string, TelemetryData>();
  const retired: number[] = []; // array of past totals

  function registerWorker(socketID: string) {
    workers.set(socketID, { hps: 0, numHashes: 0 });
  }

  function update(socketID: string, data: TelemetryData) {
    workers.set(socketID, data);
  }

  function removeWorker(socketID: string) {
    retired.push(workers.get(socketID)!.numHashes);
    workers.delete(socketID);
  }

  function getTotal(): number {
    let total = 0;
    workers.values().forEach((data) => {
      total += data.numHashes;
    });
    retired.forEach((num) => (total += num));
    return total;
  }

  // Returns the CURRENT hashes per second
  function getHPS(): number {
    let hps = 0;
    workers.values().forEach((data) => {
      hps += data.hps;
    });
    return hps;
  }

  return {
    registerWorker,
    removeWorker,
    update,
    getTotal,
    getHPS,
  };
}

export type Telemetry = ReturnType<typeof useTelemetry>
