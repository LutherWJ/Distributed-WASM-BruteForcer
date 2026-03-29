import { io } from "socket.io-client";
import type { GlobalTelemetry } from "../distributed-password-cracker/types";

// DOM references
const toggleElement = document.getElementById("challenge-toggle") as HTMLButtonElement;
const statusText = document.getElementById("status-text");
const totalHpsElement = document.getElementById("total-hps");
const totalHashesElement = document.getElementById("total-hashes");
const progressFill = document.getElementById("progress-bar-fill");
const progressText = document.getElementById("progress-text");
const leaderboardBody = document.getElementById("leaderboard-body");

const solutionAlert = document.getElementById("solution-alert");
const foundPasswordSpan = document.getElementById("admin-found-password");
const winnerNameSpan = document.getElementById("admin-winner-name");

// Socket state
const socket = io();

let isActive = false;
let isLoading = false;

toggleElement.onclick = () => {
  if (isActive) {
    socket.emit("stop");
  } else {
    socket.emit("start");
    if (solutionAlert) solutionAlert.classList.add("hidden");
  }
  isLoading = true;
  toggleElement.disabled = true;
};

socket.on("started", () => {
  isLoading = false;
  isActive = true;
  toggleElement.disabled = false;
  toggleElement.textContent = "Stop Challenge";
  toggleElement.style.background = "#f44336";
  if (statusText) statusText.textContent = "Status: Running";
});

socket.on("stopped", () => {
  isLoading = false;
  isActive = false;
  toggleElement.disabled = false;
  toggleElement.textContent = "Start Challenge";
  toggleElement.style.background = "#4caf50";
  if (statusText) statusText.textContent = "Status: Idle";
});

socket.on("solution-found", (data: { password: string; winner: string }) => {
  if (solutionAlert && foundPasswordSpan && winnerNameSpan) {
    foundPasswordSpan.textContent = data.password;
    winnerNameSpan.textContent = data.winner;
    solutionAlert.classList.remove("hidden");
    if (statusText) statusText.textContent = "Status: Completed";
  }
});

socket.on("stats-update", (data: GlobalTelemetry) => {
  if (totalHpsElement) totalHpsElement.textContent = data.totalHps.toLocaleString();
  if (totalHashesElement) totalHashesElement.textContent = data.totalHashes.toLocaleString();

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
      row.innerHTML = `
        <td>${worker.name}</td>
        <td>${worker.hps.toLocaleString()}</td>
        <td>${worker.numHashes.toLocaleString()}</td>
      `;
      leaderboardBody.appendChild(row);
    });
  }
});
