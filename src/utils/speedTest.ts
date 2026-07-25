export type TestPhase = "idle" | "download" | "done";

export interface SpeedResult {
  download: number;
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

const DOWNLOAD_CONNECTIONS = 8;
const TEST_DURATION_MS = 10000;

// ============================================================

function cacheBust(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}_cb=${Date.now()}_${Math.random().toString(36).slice(2)}`;
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

export async function runSpeedTest(
  onProgress: ProgressCallback
): Promise<SpeedResult> {
  const download = await measureDownload(onProgress);
  return { download };
}
