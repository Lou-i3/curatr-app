/**
 * Status System Utilities
 *
 * This module implements a two-dimensional status system that separates
 * user intent from computed state:
 *
 * ## MonitorStatus (Stored)
 * User intent for tracking content:
 * - WANTED: User wants this content
 * - UNWANTED: User doesn't want this content
 * - PARTIAL: Display-only, computed when children have mixed values
 *
 * ## QualityStatus (Computed)
 * Current state of content, computed from children:
 * - OK: All files verified good
 * - UNVERIFIED: Files exist but not verified
 * - BROKEN: At least one file has issues
 * - MISSING: Wanted but no files exist
 *
 * ## Computation Flow
 * - Episode quality = worst(file qualities) or MISSING if no files
 * - Season quality = worst(episode qualities)
 * - Show quality = worst(season qualities)
 *
 * ## Other Statuses
 * - FileQuality: UNVERIFIED | VERIFIED | OK | BROKEN (stored on files)
 * - FileAction: NOTHING | REDOWNLOAD | CONVERT | ORGANIZE | REPAIR
 * - PlaybackStatus: PASS | PARTIAL | FAIL
 */

import type { MonitorStatus, FileQuality, Action, PlaybackStatus } from '@/generated/prisma/client';

// Badge variant type (matches shadcn/ui Badge)
export type BadgeVariant = 'default' | 'secondary' | 'success' | 'destructive' | 'outline' | 'warning';

// Quality status for display (computed, not stored)
export type QualityStatus = 'UNVERIFIED' | 'OK' | 'BROKEN' | 'MISSING';

// Display monitor status (includes computed PARTIAL)
export type DisplayMonitorStatus = MonitorStatus | 'PARTIAL';

// ─────────────────────────────────────────────────────────────────────────────
// Display Labels
// ─────────────────────────────────────────────────────────────────────────────

export const MONITOR_STATUS_LABELS: Record<DisplayMonitorStatus, string> = {
  WANTED: 'Wanted',
  UNWANTED: 'Unwanted',
  PARTIAL: 'Partial',
};

export const QUALITY_STATUS_LABELS: Record<QualityStatus, string> = {
  UNVERIFIED: 'Unverified',
  OK: 'OK',
  BROKEN: 'Broken',
  MISSING: 'Missing',
};

export const FILE_QUALITY_LABELS: Record<FileQuality, string> = {
  UNVERIFIED: 'Unverified',
  VERIFIED: 'Verified',
  OK: 'OK',
  BROKEN: 'Broken',
};

export const ACTION_LABELS: Record<Action, string> = {
  NOTHING: 'None',
  REDOWNLOAD: 'Redownload',
  CONVERT: 'Convert',
  ORGANIZE: 'Organize',
  REPAIR: 'Repair',
};

export const PLAYBACK_STATUS_LABELS: Record<PlaybackStatus, string> = {
  PASS: 'Pass',
  PARTIAL: 'Partial',
  FAIL: 'Fail',
};

// ─────────────────────────────────────────────────────────────────────────────
// Badge Variants
// ─────────────────────────────────────────────────────────────────────────────

export function getMonitorStatusVariant(status: DisplayMonitorStatus): BadgeVariant {
  switch (status) {
    case 'WANTED':
      return 'secondary';
    case 'UNWANTED':
      return 'outline';
    case 'PARTIAL':
      return 'secondary';
  }
}

export function getQualityStatusVariant(status: QualityStatus): BadgeVariant {
  switch (status) {
    case 'OK':
      return 'success';
    case 'UNVERIFIED':
      return 'warning';
    case 'BROKEN':
      return 'destructive';
    case 'MISSING':
      return 'secondary';
  }
}

export function getFileQualityVariant(quality: FileQuality): BadgeVariant {
  switch (quality) {
    case 'VERIFIED':
    case 'OK':
      return 'success';
    case 'UNVERIFIED':
      return 'warning';
    case 'BROKEN':
      return 'destructive';
  }
}

export function getActionVariant(action: Action): BadgeVariant {
  switch (action) {
    case 'NOTHING':
      return 'outline';
    case 'REPAIR':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export function getPlaybackStatusVariant(status: PlaybackStatus): BadgeVariant {
  switch (status) {
    case 'PASS':
      return 'success';
    case 'PARTIAL':
      return 'warning';
    case 'FAIL':
      return 'destructive';
  }
}

// Legacy function for backwards compatibility during migration
export function getStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'GOOD':
    case 'WORKS':
    case 'PASS':
    case 'OK':
    case 'VERIFIED':
      return 'success';
    case 'WANTED':
      return 'secondary';
    case 'BAD':
    case 'FAILS':
    case 'FAIL':
    case 'BROKEN':
      return 'destructive';
    case 'TO_CHECK':
    case 'NOT_TESTED':
    case 'UNVERIFIED':
    case 'PARTIAL':
      return 'warning';
    case 'MISSING':
    case 'PLAYABLE':
      return 'secondary';
    case 'UNWANTED':
    case 'DELETED':
    case 'NOTHING':
      return 'outline';
    default:
      return 'outline';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Computed Quality Status
// ─────────────────────────────────────────────────────────────────────────────

// Priority order: BROKEN > MISSING > UNVERIFIED > OK
const QUALITY_PRIORITY: Record<QualityStatus, number> = {
  OK: 0,
  UNVERIFIED: 1,
  MISSING: 2,
  BROKEN: 3,
};

function worstQuality(statuses: QualityStatus[]): QualityStatus {
  if (statuses.length === 0) return 'UNVERIFIED';

  return statuses.reduce((worst, current) =>
    QUALITY_PRIORITY[current] > QUALITY_PRIORITY[worst] ? current : worst
  );
}

/**
 * Compute episode quality status from its files
 */
export function computeEpisodeQuality(
  monitorStatus: MonitorStatus,
  files: { quality: FileQuality }[]
): QualityStatus {
  if (files.length === 0) {
    // No files: MISSING if wanted, otherwise just show as UNVERIFIED
    return monitorStatus === 'WANTED' ? 'MISSING' : 'UNVERIFIED';
  }

  // Map file qualities to quality status
  // VERIFIED and OK both map to OK for display purposes
  const fileQualities: QualityStatus[] = files.map((f) => {
    switch (f.quality) {
      case 'OK':
      case 'VERIFIED':
        return 'OK';
      case 'BROKEN':
        return 'BROKEN';
      case 'UNVERIFIED':
      default:
        return 'UNVERIFIED';
    }
  });

  return worstQuality(fileQualities);
}

/**
 * Compute season quality status from its episodes
 */
export function computeSeasonQuality(
  episodes: { qualityStatus: QualityStatus }[]
): QualityStatus {
  if (episodes.length === 0) return 'UNVERIFIED';
  return worstQuality(episodes.map((e) => e.qualityStatus));
}

/**
 * Compute show quality status from its seasons
 */
export function computeShowQuality(
  seasons: { qualityStatus: QualityStatus }[]
): QualityStatus {
  if (seasons.length === 0) return 'UNVERIFIED';
  return worstQuality(seasons.map((s) => s.qualityStatus));
}

// ─────────────────────────────────────────────────────────────────────────────
// Display Monitor Status (with PARTIAL detection)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get display monitor status, detecting PARTIAL when children have mixed values
 */
export function getDisplayMonitorStatus(
  entityStatus: MonitorStatus,
  children: { monitorStatus: MonitorStatus }[]
): DisplayMonitorStatus {
  if (children.length === 0) return entityStatus;

  const hasWanted = children.some((c) => c.monitorStatus === 'WANTED');
  const hasUnwanted = children.some((c) => c.monitorStatus === 'UNWANTED');

  if (hasWanted && hasUnwanted) return 'PARTIAL';
  return entityStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Options for Select Components
// ─────────────────────────────────────────────────────────────────────────────

export const MONITOR_STATUS_OPTIONS: { value: MonitorStatus; label: string }[] = [
  { value: 'WANTED', label: 'Wanted' },
  { value: 'UNWANTED', label: 'Unwanted' },
];

export const FILE_QUALITY_OPTIONS: { value: FileQuality; label: string }[] = [
  { value: 'UNVERIFIED', label: 'Unverified' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'OK', label: 'OK' },
  { value: 'BROKEN', label: 'Broken' },
];

export const ACTION_OPTIONS: { value: Action; label: string }[] = [
  { value: 'NOTHING', label: 'None' },
  { value: 'REDOWNLOAD', label: 'Redownload' },
  { value: 'CONVERT', label: 'Convert' },
  { value: 'ORGANIZE', label: 'Organize' },
  { value: 'REPAIR', label: 'Repair' },
];

export const PLAYBACK_STATUS_OPTIONS: { value: PlaybackStatus; label: string }[] = [
  { value: 'PASS', label: 'Pass' },
  { value: 'FAIL', label: 'Fail' },
];
