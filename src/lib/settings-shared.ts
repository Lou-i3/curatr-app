/**
 * Shared settings types and constants (safe for client and server)
 */

export type DateFormat = 'EU' | 'US' | 'ISO';

export interface AppSettings {
  id: number;
  dateFormat: DateFormat;
  updatedAt: Date;
}

/**
 * Format a date according to the specified format
 */
export function formatDateWithFormat(date: Date, format: DateFormat): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  switch (format) {
    case 'US':
      return `${month}/${day}/${year}`;
    case 'ISO':
      return `${year}-${month}-${day}`;
    case 'EU':
    default:
      return `${day}/${month}/${year}`;
  }
}

/**
 * Format a datetime according to the specified format
 */
export function formatDateTimeWithFormat(date: Date, format: DateFormat): string {
  const dateStr = formatDateWithFormat(date, format);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}`;
}

/**
 * Date format labels for UI
 */
export const DATE_FORMAT_OPTIONS = [
  { value: 'EU', label: 'European (DD/MM/YYYY)', example: '05/02/2026' },
  { value: 'US', label: 'American (MM/DD/YYYY)', example: '02/05/2026' },
  { value: 'ISO', label: 'ISO (YYYY-MM-DD)', example: '2026-02-05' },
] as const;
