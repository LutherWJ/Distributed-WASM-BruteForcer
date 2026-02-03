import { io } from "socket.io-client";
import type { Job, TelemetryData } from "./types";

type WorkerStatus = "idle" | "active";

// DOM References
const statusElement = document.getElementById("status");
const myHashesElement = document.getElementById("my-hashes");
const totalHashesElement = document.getElementById("total-hashes");
const myHpsElement = document.getElementById("my-hps");
const totalHpsElement = document.getElementById("total-hps");

// Thread state
const threadCount = navigator.hardwareConcurrency;
const workers: Worker[] = [];
const workStatus: WorkerStatus[] = [];
const countViews: Uint32Array[] = [];
let readyWorkers = 0; // Count of workers finished with initialization
let completedWorkers = 0; // Count of workers who have completed their job
let startTime: number | null = null;

// Web socket
const socket = io();

socket.on("connect", () => {
  console.log("[Main] Socket connected:", socket.id);
  if (statusElement) statusElement.textContent = "Connected";
  if (readyWorkers === threadCount) {
    socket.emit("ready");
  }
});

socket.on("disconnect", () => {
  console.log("[Main] Socket disconnected");
});

socket.on("connect_error", (err) => {
  console.error("[Main] Socket connection error:", err);
});

for (let i = 0; i < threadCount; i++) {
  workers[i] = new Worker("./worker.js");
  workStatus[i] = "idle";
  workers[i]!.onmessage = (event) => {
    switch (event.data.type) {
      case "ready":
        console.log(`[Main] Worker ${i} ready`);
        countViews[i] = new Uint32Array(event.data.buffer, event.data.ptr, 1);
        readyWorkers++;
        if (readyWorkers === threadCount) {
          console.log("[Main] All workers ready, sending ready signal");
          socket.emit("ready");
        }
        break;
      case "found":
        console.log(`[Main] Worker ${i} found password:`, event.data.password);
        socket.emit("found", event.data.password);
        break;
      case "completed":
        completedWorkers++;
        if (completedWorkers === threadCount) {
          socket.emit("job-completed");
        }
        break;
      case "error":
        console.error(`[Main] Worker ${i} reported an error`);
        break;
    }
  };
}
console.log(`Thread count: ${threadCount}`);

setInterval(() => {
  let myHashes = 0;
  for (const view of countViews) {
    if (view) myHashes += view[0]!;
  }
  if (myHashesElement) myHashesElement.textContent = myHashes.toString();
}, 100);

socket.on("job", (job: Job) => {
  completedWorkers = 0;

  if (startTime === null) {
    startTime = Date.now();
  }

  // Split the workload among threads
  const jobSplit = Math.floor(job.size / threadCount);
  const extra = job.size % threadCount;

  for (let i = 0; i < threadCount; i++) {
    const pad = i === threadCount - 1 ? extra : 0;

    workers[i]!.postMessage({
      size: jobSplit + pad,
      index: job.index + jobSplit * i,
      length: job.length,
      target: job.target,
      charset: job.charset,
    });
  }
});

// telemetry

const statsInterval = setInterval(() => {
  if (startTime === null) return;

  let myHashes: number = 0;
  countViews.forEach((count) => {
    myHashes += Atomics.load(count, 0);
  });

  const currentTime = Date.now();
  const elapsedSeconds = (currentTime - startTime) / 1000;
  const myHps = elapsedSeconds > 0 ? Math.floor(myHashes / elapsedSeconds) : 0;

  const data: TelemetryData = {
    numHashes: myHashes,
    hps: myHps,
  };

  if (myHashesElement) myHashesElement.textContent = myHashes.toString();
  if (myHpsElement) myHpsElement.textContent = myHps.toString();
  socket.emit("status-report", data);
}, 1000);

socket.on("stats-update", (data: TelemetryData) => {
  if (totalHashesElement)
    totalHashesElement.textContent = data.numHashes.toString();
  if (totalHpsElement) totalHpsElement.textContent = data.hps.toString();
});
