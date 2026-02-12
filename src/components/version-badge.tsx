'use client';

/**
 * StatusIndicator - Colored dot indicating version check result
 * Used in AppBar to show update status next to version number
 */

import { type UpdateStatus } from '@/hooks/use-version-check';

/**
 * Colored status dot indicating version check result
 */
export function StatusIndicator({ status }: { status: UpdateStatus }) {
  switch (status) {
    case 'loading':
      return (
        <span className="size-2 rounded-full bg-muted animate-pulse" aria-label="Checking..." />
      );
    case 'up-to-date':
      return (
        <span className="size-2 rounded-full bg-primary" aria-label="Up to date" />
      );
    case 'update-available':
      return (
        <span className="size-2 rounded-full bg-warning animate-pulse" aria-label="Update available" />
      );
    case 'no-releases':
      return (
        <span className="size-2 rounded-full bg-secondary" aria-label="No releases yet" />
      );
    case 'error':
      return (
        <span className="size-2 rounded-full bg-destructive" aria-label="Error checking updates" />
      );
    default:
      return null;
  }
}
