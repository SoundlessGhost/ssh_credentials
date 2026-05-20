// Tiny formatting helpers shared by the upload tray and file list.

export function formatBytes(n: number): string {
  if (!isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (!isFinite(bytesPerSec) || bytesPerSec <= 0) return "—";
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatEta(secondsLeft: number): string {
  if (!isFinite(secondsLeft) || secondsLeft < 0) return "—";
  if (secondsLeft < 60) return `${Math.round(secondsLeft)}s`;
  if (secondsLeft < 3600) return `${Math.round(secondsLeft / 60)}m`;
  return `${Math.round(secondsLeft / 3600)}h`;
}
