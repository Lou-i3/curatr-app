/**
 * Formatting utilities for display
 */

import { getSettings } from './settings';
import { formatDateWithFormat, formatDateTimeWithFormat } from './settings-shared';

export function formatFileSize(bytes: bigint): string {
  const num = Number(bytes);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
}

/**
 * Format a date using the app's configured date format
 * Automatically fetches settings (cached per request)
 */
export async function formatDate(date: Date): Promise<string> {
  const settings = await getSettings();
  return formatDateWithFormat(date, settings.dateFormat);
}

/**
 * Format a datetime using the app's configured date format
 * Automatically fetches settings (cached per request)
 */
export async function formatDateTime(date: Date): Promise<string> {
  const settings = await getSettings();
  return formatDateTimeWithFormat(date, settings.dateFormat);
}

// Re-export the sync versions for cases where format is already known
export { formatDateWithFormat, formatDateTimeWithFormat } from './settings-shared';
export type { DateFormat } from './settings-shared';
