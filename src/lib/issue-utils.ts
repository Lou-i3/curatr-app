/**
 * Issue system utilities
 * Labels, variants, and helpers for issue types and statuses
 */

import type { IssueType, IssueStatus } from '@/generated/prisma/client';
import type { BadgeVariant } from '@/lib/status';

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
