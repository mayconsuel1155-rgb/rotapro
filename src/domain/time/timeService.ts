/**
 * Time utility functions for RotaPro
 * Complies with Section 6 of specification:
 * - Timestamps are the source of truth
 * - Durations are calculated by difference between timestamps
 * - 24-hour Brazilian time format (dd/MM/yyyy and HH:mm)
 */

export function getNowIso(): string {
  return new Date().toISOString();
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateBr(isoOrDateStr: string | undefined): string {
  if (!isoOrDateStr) return '--/--/----';
  // If YYYY-MM-DD
  if (isoOrDateStr.length === 10 && isoOrDateStr.includes('-')) {
    const [y, m, d] = isoOrDateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  const date = new Date(isoOrDateStr);
  if (isNaN(date.getTime())) return '--/--/----';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatTime24h(isoStr: string | undefined): string {
  if (!isoStr) return '--:--';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return '--:--';
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

export function formatTimeWithSeconds(isoStr: string | undefined): string {
  if (!isoStr) return '--:--:--';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return '--:--:--';
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  const secs = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${mins}:${secs}`;
}

/**
 * Calculates duration in integer seconds between two ISO timestamps.
 * If endedAt is undefined, calculates from startedAt to now.
 */
export function calculateDurationSeconds(startedAt?: string, endedAt?: string): number {
  if (!startedAt) return 0;
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  if (isNaN(start) || isNaN(end) || end < start) return 0;
  return Math.floor((end - start) / 1000);
}

/**
 * Formats seconds into HH:MM:SS (large stopwatches)
 */
export function formatTimerDisplay(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const remainingSecs = secs % 60;

  const hStr = String(hours).padStart(2, '0');
  const mStr = String(minutes).padStart(2, '0');
  const sStr = String(remainingSecs).padStart(2, '0');

  return `${hStr}:${mStr}:${sStr}`;
}

/**
 * Formats duration in human readable string: e.g. "1h 25m" or "45m" or "30s"
 */
export function formatDurationHuman(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes} min`;
  }
  return `${secs} s`;
}
