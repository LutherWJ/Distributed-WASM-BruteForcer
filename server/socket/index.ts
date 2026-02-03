import { Socket, Server as SocketIOServer } from "socket.io";
import { useOrchestrator } from './services/orchestrator'
import type { Orchestrator } from "./services/orchestrator";
import { handleJobCompletion, handleSolution } from './handlers/ochestratorHandlers';
import type {TelemetryData, Job} from "../types.ts";
import {type Telemetry, useTelemetry} from "./services/telemetry.ts";
import config from "../config";


export function initSocket(io: SocketIOServer) {
    const orchestrator: Orchestrator = useOrchestrator();
    const telemetry: Telemetry = useTelemetry();
    orchestrator.init();

    io.on("connection", (socket: Socket) => {
        console.log(`[SOCKET] connection from ${socket.id}`)
        orchestrator.registerWorker(socket.id);
        telemetry.registerWorker(socket.id);

        const interval = setInterval(() => {
            const data: TelemetryData = {
                hps: telemetry.getHPS(),
                numHashes: telemetry.getTotal(),
            }
            socket.emit('stats-update', data);
        }, 1000)

        socket.on('ready', () => {
            const index = orchestrator.getJob(socket.id);
            if (index === -1) return;

            const job: Job = {
                index: index * config.jobSize,
                size: config.jobSize,
                length: config.passwordLength,
                charset: config.charset,
                target: orchestrator.getTargetHash(),
            };

            socket.emit('job', job);
        })

        socket.on('job-completed', () => {
            handleJobCompletion(socket, orchestrator);
        });

        socket.on('found', (password) => {
            handleSolution(socket, orchestrator, password);
        });

        socket.on('status-report', (data: TelemetryData) => {
            telemetry.update(socket.id, data);
        });

        socket.on("disconnect", () => {
            orchestrator.removeWorker(socket.id);
            telemetry.removeWorker(socket.id);
        });
    });
}