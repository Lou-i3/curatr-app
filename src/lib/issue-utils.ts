/**
 * Issue system utilities
 * Labels, variants, and helpers for issue types and statuses
 */

import type { IssueType, IssueStatus } from '@/generated/prisma/client';
import type { BadgeVariant } from '@/lib/status';
import {
  PlayCircle,
  Eye,
  Volume2,
  Captions,
  FileWarning,
  CircleHelp,
  Circle,
  CircleDot,
  Loader,
  CheckCircle2,
  XCircle,
  Monitor,
  type LucideIcon,
} from 'lucide-react';

/** Icon for each issue type */
export const ISSUE_TYPE_ICONS: Record<IssueType, LucideIcon> = {
  PLAYBACK: PlayCircle,
  QUALITY: Eye,
  AUDIO: Volume2,
  SUBTITLE: Captions,
  CONTENT: FileWarning,
  OTHER: CircleHelp,
};

/** Icon for each issue status */
export const ISSUE_STATUS_ICONS: Record<IssueStatus, LucideIcon> = {
  OPEN: Circle,
  ACKNOWLEDGED: CircleDot,
  IN_PROGRESS: Loader,
  RESOLVED: CheckCircle2,
  CLOSED: XCircle,
};

/** Icon for platform context */
export const PLATFORM_ICON = Monitor;

/** Human-readable labels for issue types */
export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  PLAYBACK: "Won't Play",
  QUALITY: 'Bad Quality',
  AUDIO: 'Audio Issue',
  SUBTITLE: 'Subtitle Issue',
  CONTENT: 'Wrong Content',
  OTHER: 'Other',
};

/** Human-readable labels for issue statuses */
export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  OPEN: 'Open',
  ACKNOWLEDGED: 'Acknowledged',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

/** Badge variant for issue type */
export function getIssueTypeVariant(type: IssueType): BadgeVariant {
  switch (type) {
    case 'PLAYBACK': return 'destructive';
    case 'QUALITY': return 'warning';
    case 'AUDIO': return 'warning';
    case 'SUBTITLE': return 'secondary';
    case 'CONTENT': return 'destructive';
    case 'OTHER': return 'outline';
  }
}

/** Badge variant for issue status */
export function getIssueStatusVariant(status: IssueStatus): BadgeVariant {
  switch (status) {
    case 'OPEN': return 'destructive';
    case 'ACKNOWLEDGED': return 'warning';
    case 'IN_PROGRESS': return 'default';
    case 'RESOLVED': return 'success';
    case 'CLOSED': return 'secondary';
  }
}

/** All issue types for selection UI */
export const ISSUE_TYPES: IssueType[] = ['PLAYBACK', 'QUALITY', 'AUDIO', 'SUBTITLE', 'CONTENT', 'OTHER'];

/** All issue statuses */
export const ISSUE_STATUSES: IssueStatus[] = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

/** Sub-types for AUDIO and SUBTITLE issues */
export const ISSUE_SUB_TYPES = ['WRONG_LANGUAGE', 'OUT_OF_SYNC', 'MISSING', 'BAD_QUALITY'] as const;
export type IssueSubType = (typeof ISSUE_SUB_TYPES)[number];

export const ISSUE_SUB_TYPE_LABELS: Record<IssueSubType, string> = {
  WRONG_LANGUAGE: 'Wrong Language',
  OUT_OF_SYNC: 'Out of Sync',
  MISSING: 'Missing',
  BAD_QUALITY: 'Bad Quality',
};

/** Types that support sub-type selection */
export const TYPES_WITH_SUB_TYPE: IssueType[] = ['AUDIO', 'SUBTITLE'];
