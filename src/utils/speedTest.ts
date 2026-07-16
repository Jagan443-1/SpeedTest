export type TestPhase = "idle" | "ping" | "download" | "upload" | "done";

export interface SpeedResult {
  ping: number;
  download: number;
  upload: number;
  jitter: number;
}

export type ProgressCallback = (
  phase: TestPhase,
  currentSpeed: number,
  progress: number
) => void;

// ============================================================
// CONFIG - Replace these with your own hosted files to avoid
// third-party dependencies. See server/README.md for how to
// self-host.
// ============================================================

// 100MB test file - must support CORS and range requests
const DOWNLOAD_URL =
  "https://speed-api.livid.workers.dev/download";

// Ping endpoints - small files with CORS
const PING_URLS = [
  "https://speed-api.livid.workers.dev/ping",
];

// Upload endpoint - must accept POST with CORS
const UPLOAD_URL = "https://speed-api.livid.workers.dev/upload";

const DOWNLOAD_CONNECTIONS = 8;
const TEST_DURATION_MS = 10000;
const PING_SAMPLES = 20;

// ============================================================

function cacheBust(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}_cb=${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export async function measurePing(
  onProgress: ProgressCallback
): Promise<{ ping: number; jitter: number }> {
  onProgress("ping", 0, 0);
  const pings: number[] = [];

  for (let i = 0; i < PING_SAMPLES; i++) {
    const url = cacheBust(PING_URLS[i % PING_URLS.length]);
    const start = performance.now();
    try {
      await fetch(url, { mode: "no-cors", cache: "no-store" });
    } catch {
      // ignore
    }
    const end = performance.now();
    pings.push(end - start);
    onProgress("ping", 0, ((i + 1) / PING_SAMPLES) * 100);
  }

  pings.sort((a, b) => a - b);
  const trimmed = pings.slice(
    Math.floor(PING_SAMPLES * 0.1),
    Math.ceil(PING_SAMPLES * 0.9)
  );
  const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;

  let jitterSum = 0;
  for (let i = 1; i < trimmed.length; i++) {
    jitterSum += Math.abs(trimmed[i] - trimmed[i - 1]);
  }
  const jitter = jitterSum / (trimmed.length - 1);

  return {
    ping: Math.round(avg),
    jitter: Math.round(jitter * 10) / 10,
  };
}

async function downloadChunk(
  url: string,
  signal: AbortSignal,
  onBytes: (n: number) => void
): Promise<void> {
  try {
    const res = await fetch(cacheBust(url), {
      cache: "no-store",
      signal,
    });
    if (!res.ok) return;
    const reader = res.body!.getReader();
    while (true) {
      if (signal.aborted) {
        reader.cancel();
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;
      onBytes(value.byteLength);
    }
  } catch {
    // connection failed or aborted
  }
}

export async function measureDownload(
  onProgress: ProgressCallback
): Promise<number> {
  onProgress("download", 0, 0);

  let totalBytes = 0;
  let lastCheckBytes = 0;
  const startTime = performance.now();
  let lastCheckTime = startTime;
  const speedSamples: number[] = [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TEST_DURATION_MS);

  const updateInterval = setInterval(() => {
    const now = performance.now();
    const intervalSec = (now - lastCheckTime) / 1000;
    if (intervalSec > 0) {
      const intervalBytes = totalBytes - lastCheckBytes;
      const instantSpeed = (intervalBytes * 8) / intervalSec / 1000000;
      speedSamples.push(instantSpeed);
      lastCheckBytes = totalBytes;
      lastCheckTime = now;
      const avgSpeed =
        speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length;
      const progress = Math.min(
        ((performance.now() - startTime) / TEST_DURATION_MS) * 100,
        100
      );
      onProgress("download", avgSpeed, progress);
    }
  }, 100);

  const onBytes = (n: number) => {
    totalBytes += n;
  };

  const chunks = Array.from({ length: DOWNLOAD_CONNECTIONS }, () =>
    downloadChunk(DOWNLOAD_URL, controller.signal, onBytes)
  );

  await Promise.all(chunks);
  clearTimeout(timeoutId);
  clearInterval(updateInterval);

  const finalSpeed =
    speedSamples.length > 0
      ? speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length
      : 0;
  onProgress("download", Math.round(finalSpeed * 100) / 100, 100);
  return Math.round(finalSpeed * 100) / 100;
}

export async function measureUpload(
  onProgress: ProgressCallback
): Promise<number> {
  onProgress("upload", 0, 0);

  let totalBytes = 0;
  let lastCheckBytes = 0;
  const startTime = performance.now();
  let lastCheckTime = startTime;
  const speedSamples: number[] = [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TEST_DURATION_MS);

  const updateInterval = setInterval(() => {
    const now = performance.now();
    const intervalSec = (now - lastCheckTime) / 1000;
    if (intervalSec > 0) {
      const intervalBytes = totalBytes - lastCheckBytes;
      const instantSpeed = (intervalBytes * 8) / intervalSec / 1000000;
      speedSamples.push(instantSpeed);
      lastCheckBytes = totalBytes;
      lastCheckTime = now;
      const avgSpeed =
        speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length;
      const progress = Math.min(
        ((performance.now() - startTime) / TEST_DURATION_MS) * 100,
        100
      );
      onProgress("upload", avgSpeed, progress);
    }
  }, 100);

  const uploadOne = async () => {
    while (!controller.signal.aborted) {
      const data = new Uint8Array(50000);
      crypto.getRandomValues(data);
      try {
        await fetch(cacheBust(UPLOAD_URL), {
          method: "POST",
          body: new Blob([data]),
          cache: "no-store",
          signal: controller.signal,
        });
        totalBytes += 50000;
      } catch {
        break;
      }
    }
  };

  await Promise.all([uploadOne(), uploadOne(), uploadOne(), uploadOne()]);
  clearTimeout(timeoutId);
  clearInterval(updateInterval);

  const finalSpeed =
    speedSamples.length > 0
      ? speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length
      : 0;
  onProgress("upload", Math.round(finalSpeed * 100) / 100, 100);
  return Math.round(finalSpeed * 100) / 100;
}

export async function runSpeedTest(
  onProgress: ProgressCallback
): Promise<SpeedResult> {
  const { ping, jitter } = await measurePing(onProgress);
  const download = await measureDownload(onProgress);
  const upload = await measureUpload(onProgress);
  return { ping, download, upload, jitter };
}
