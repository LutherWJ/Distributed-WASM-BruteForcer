export type Job = {
    index: number; // Index of possible combinations
    size: number; // Number of combinations to check
    length: number; // Password length
    charset: string; // Character set being searched
    target: Uint8Array; // Target hash
};

export type TelemetryData = {
    hps: number; // Hashes per second
    numHashes: number; // Raw number of hashes sometimes periodical sometimes grand total.
    name: string; // Name of the worker
}

export type WorkerStats = {
    id: string;
    name: string;
    hps: number;
    numHashes: number;
}

export type GlobalTelemetry = {
    totalHps: number;
    totalHashes: number;
    workers: WorkerStats[];
    progress: {
        completed: number;
        total: number;
    };
}
