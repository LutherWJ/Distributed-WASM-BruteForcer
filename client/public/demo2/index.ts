import { io } from "socket.io-client";
import type { Job, TelemetryData, GlobalTelemetry } from "./types";

type WorkerStatus = "idle" | "active";

// DOM References
const nameInputElement = document.getElementById('name-box') as HTMLInputElement;
const connectBtnElement = document.getElementById('connect-btn');
const errBoxElement = document.getElementById('err-box');
const statusElement = document.getElementById("status");
const myHashesElement = document.getElementById("my-hashes");
const totalHashesElement = document.getElementById("total-hashes");
const myHpsElement = document.getElementById("my-hps");
const totalHpsElement = document.getElementById("total-hps");
const leaderboardBody = document.getElementById("leaderboard-body");
const progressFill = document.getElementById("progress-bar-fill");
const progressText = document.getElementById("progress-text");

const solutionOverlay = document.getElementById("solution-overlay");
const foundPasswordSpan = document.getElementById("found-password");
const winnerNameSpan = document.getElementById("winner-name");
const closeOverlayBtn = document.getElementById("close-overlay");

let name = '';

// Thread state
const threadCount = navigator.hardwareConcurrency;
const workers: Worker[] = [];
const workStatus: WorkerStatus[] = [];
const countViews: Uint32Array[] = [];
let readyWorkers = 0; // Count of workers finished with initialization
let completedWorkers = 0; // Count of workers who have completed their job
let startTime: number | null = null;
const jobQueue: Job[] = [];
const MAX_QUEUE_SIZE = 2;
let isProcessing = false;
let isFinished = false;

function init() {
  if (errBoxElement) errBoxElement.textContent = '';
  if (!nameInputElement!.value) {
    if (errBoxElement) errBoxElement.textContent = 'Name is required';
    return;
  }
  name = nameInputElement!.value;
  // Disable input and button after connecting
  nameInputElement.disabled = true;
  if (connectBtnElement) (connectBtnElement as HTMLButtonElement).disabled = true;
  
  main();
}

function main() {
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
    if (statusElement) statusElement.textContent = "Disconnected";
  });

  socket.on("connect_error", (err) => {
    console.error("[Main] Socket connection error:", err);
    if (statusElement) statusElement.textContent = "Connection Error";
  });

  function processQueue() {
    if (isProcessing || jobQueue.length === 0) return;

    const job = jobQueue.shift();
    if (!job) return;

    isProcessing = true;
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
  }

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
            isProcessing = false;
            processQueue();
          }
          break;
        case "error":
          console.error(`[Main] Worker ${i} reported an error`);
          break;
      }
    };
  }
  console.log(`Thread count: ${threadCount}`);

  socket.on("job", (job: Job) => {
    if (isFinished) {
      isFinished = false;
      startTime = Date.now(); // Reset start time for the new run
    }
    jobQueue.push(job);
    processQueue();
    if (jobQueue.length + (isProcessing ? 1 : 0) < MAX_QUEUE_SIZE) {
      socket.emit("ready");
    }
  });

  // Telemetry reporting
  setInterval(() => {
    if (startTime === null || isFinished) return;

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
      name: name,
    };

    if (myHashesElement) myHashesElement.textContent = myHashes.toLocaleString();
    if (myHpsElement) myHpsElement.textContent = myHps.toLocaleString();
    socket.emit("status-report", data);
  }, 1000);

  // Global telemetry updates
  socket.on("stats-update", (data: GlobalTelemetry) => {
    if (totalHashesElement)
      totalHashesElement.textContent = data.totalHashes.toLocaleString();
    if (totalHpsElement) 
      totalHpsElement.textContent = data.totalHps.toLocaleString();

    if (progressFill && progressText) {
      const { completed, total } = data.progress;
      const percentage = total > 0 ? (completed / total) * 100 : 0;
      progressFill.style.width = `${percentage}%`;
      progressText.textContent = `${completed.toLocaleString()} / ${total.toLocaleString()} batches (${percentage.toFixed(2)}%)`;
    }

    if (leaderboardBody) {
      leaderboardBody.innerHTML = "";
      data.workers.forEach((worker) => {
        const row = document.createElement("tr");
        if (worker.name === name) {
          row.style.fontWeight = "bold";
          row.style.backgroundColor = "#e6f7ff";
        }
        
        row.innerHTML = `
          <td>${worker.name}</td>
          <td>${worker.hps.toLocaleString()}</td>
          <td>${worker.numHashes.toLocaleString()}</td>
        `;
        leaderboardBody.appendChild(row);
      });
    }
  });

  socket.on("solution-found", (data: { password: string; winner: string }) => {
    isFinished = true;
    isProcessing = false;
    if (solutionOverlay && foundPasswordSpan && winnerNameSpan) {
      foundPasswordSpan.textContent = data.password;
      winnerNameSpan.textContent = data.winner;
      solutionOverlay.classList.remove("hidden");
    }
  });

  if (closeOverlayBtn) {
    closeOverlayBtn.onclick = () => {
      if (solutionOverlay) solutionOverlay.classList.add("hidden");
    };
  }
}

if (connectBtnElement) connectBtnElement.onclick = init;
