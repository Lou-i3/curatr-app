'use client';

/**
 * Issue Detail Client Component
 * Orchestrates the issue detail view with info card, episodes, comments, and related issues
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Pencil, Trash2, User, Captions, Volume2 as Volume2Icon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BadgeSelector } from '@/components/badge-selector';
import { useAuth } from '@/lib/contexts/auth-context';
import { useIssueContext } from '@/lib/contexts/issue-context';
import {
  ISSUE_TYPE_LABELS,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUSES,
  ISSUE_TYPE_ICONS,
  ISSUE_STATUS_ICONS,
  ISSUE_SUB_TYPE_LABELS,
  PLATFORM_ICON,
  getIssueTypeVariant,
  getIssueStatusVariant,
  type IssueSubType,
} from '@/lib/issue-utils';
import { getLanguageName } from '@/lib/languages';
import {
  formatDateWithFormat,
  formatDateTimeWithFormat,
  type DateFormat,
} from '@/lib/settings-shared';
import { IssueCommentThread } from './issue-comment-thread';
import { IssueCommentForm } from './issue-comment-form';
import { IssueEditForm } from './issue-edit-form';
import type { IssueType, IssueStatus, IssueCommentType } from '@/generated/prisma/client';

interface EpisodeData {
  id: number;
  episodeId: number;
  createdAt: string;
  episode: {
    id: number;
    episodeNumber: number;
    title: string | null;
    season: {
      seasonNumber: number;
      tvShow: { id: number; title: string };
    };
  };
}

interface CommentData {
  id: number;
  type: IssueCommentType;
  content: string;
  createdAt: string;
  user: { id: number; username: string; thumbUrl: string | null };
}

interface IssueData {
  id: number;
  type: IssueType;
  status: IssueStatus;
  description: string | null;
  platform: string | null;
  audioLang: string | null;
  subtitleLang: string | null;
  subType: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: number; username: string; thumbUrl: string | null; role: string };
  episodes: EpisodeData[];
  comments: CommentData[];
}

interface RelatedIssue {
  id: number;
  type: string;
  status: string;
  createdAt: string;
  user: { id: number; username: string; thumbUrl: string | null };
  _count: { episodes: number };
}

interface IssueDetailClientProps {
  issue: IssueData;
  relatedIssues: RelatedIssue[];
  dateFormat: DateFormat;
}

export function IssueDetailClient({
  issue: initialIssue,
  relatedIssues,
  dateFormat,
}: IssueDetailClientProps) {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { refresh: refreshCounts } = useIssueContext();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isOwner = user?.id === initialIssue.user.id;
  const canEdit = isOwner && initialIssue.status === 'OPEN';

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      try {
        const res = await fetch(`/api/issues/${initialIssue.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update status');
        }
        toast.success(`Status changed to ${ISSUE_STATUS_LABELS[newStatus as IssueStatus]}`);
        refreshCounts();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update status');
      }
    },
    [initialIssue.id, refreshCounts, router]
  );

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/issues/${initialIssue.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toast.success('Issue deleted');
      refreshCounts();
      router.push('/issues');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  }, [initialIssue.id, refreshCounts, router]);

  const canDelete = isAdmin || (isOwner && initialIssue.status === 'OPEN');

  // Group episodes by show
  const showTitle = initialIssue.episodes[0]?.episode.season.tvShow.title;
  const showId = initialIssue.episodes[0]?.episode.season.tvShow.id;

  const StatusIcon = ISSUE_STATUS_ICONS[initialIssue.status];
  const TypeIcon = ISSUE_TYPE_ICONS[initialIssue.type];
  const PlatIcon = PLATFORM_ICON;

  return (
    <div className="space-y-6 md:space-y-8 mt-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-2">
          {/* Title + type badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold">Issue #{initialIssue.id}</h1>
            <Badge variant={getIssueTypeVariant(initialIssue.type)}>
              <TypeIcon className="size-3 mr-1" />
              {ISSUE_TYPE_LABELS[initialIssue.type]}
            </Badge>
            {initialIssue.subType && (
              <Badge variant="outline">
                {ISSUE_SUB_TYPE_LABELS[initialIssue.subType as IssueSubType]}
              </Badge>
            )}
          </div>

          {/* Reporter + date + context info */}
          <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              {initialIssue.user.thumbUrl ? (
                <img
                  src={initialIssue.user.thumbUrl}
                  alt={initialIssue.user.username}
                  className="size-4 rounded-full shrink-0"
                />
              ) : (
                <User className="size-3.5" />
              )}
              <span className="font-medium text-foreground">{initialIssue.user.username}</span>
            </span>
            <span>·</span>
            <span>{formatDateTimeWithFormat(new Date(initialIssue.createdAt), dateFormat)}</span>
            {initialIssue.platform && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <PlatIcon className="size-3.5" />
                  {initialIssue.platform}
                </span>
              </>
            )}
            {initialIssue.audioLang && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Volume2Icon className="size-3.5" />
                  {getLanguageName(initialIssue.audioLang)}
                </span>
              </>
            )}
            {initialIssue.subtitleLang && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Captions className="size-3.5" />
                  {getLanguageName(initialIssue.subtitleLang)}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <BadgeSelector
              value={initialIssue.status}
              options={ISSUE_STATUSES.map((s) => ({
                value: s,
                label: ISSUE_STATUS_LABELS[s],
              }))}
              displayLabel={ISSUE_STATUS_LABELS[initialIssue.status]}
              variant={getIssueStatusVariant(initialIssue.status)}
              getVariant={getIssueStatusVariant}
              getIcon={(s) => {
                const Icon = ISSUE_STATUS_ICONS[s as IssueStatus];
                return <Icon className="size-3 mr-1" />;
              }}
              onValueChange={handleStatusChange}
              icon={<StatusIcon className="size-3 mr-1" />}
            />
          ) : (
            <Badge variant={getIssueStatusVariant(initialIssue.status)}>
              <StatusIcon className="size-3 mr-1" />
              {ISSUE_STATUS_LABELS[initialIssue.status]}
            </Badge>
          )}
          {isOwner && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEditDialogOpen(true)}
                      disabled={!canEdit}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canEdit && (
                  <TooltipContent>Issues can only be edited while open</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
          {canDelete && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleting}
              className="text-destructive-foreground"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 md:gap-8">
        {/* Left column: main content */}
        <div className="space-y-6 order-2 md:order-1">
          {/* Description */}
          {initialIssue.description && (
            <p className="text-sm whitespace-pre-wrap">{initialIssue.description}</p>
          )}

          {/* Episodes section (no card) */}
          {initialIssue.episodes.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-bold">
                Episodes ({initialIssue.episodes.length})
              </h2>
              {showTitle && (
                <Link
                  href={`/tv-shows/${showId}`}
                  className="text-sm font-medium hover:text-primary transition-colors block"
                >
                  {showTitle}
                </Link>
              )}
              {initialIssue.episodes.map((ie) => {
                const ep = ie.episode;
                return (
                  <Link
                    key={ie.id}
                    href={`/tv-shows/${ep.season.tvShow.id}/episodes/${ep.id}`}
                    className="block text-sm hover:text-primary transition-colors pl-2 border-l-2 border-border"
                  >
                    <span className="text-muted-foreground">
                      S{String(ep.season.seasonNumber).padStart(2, '0')}E
                      {String(ep.episodeNumber).padStart(2, '0')}
                    </span>
                    {ep.title && (
                      <span className="text-muted-foreground"> · {ep.title}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Comments & Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comments & Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
              <IssueCommentForm
                issueId={initialIssue.id}
                onCommentAdded={() => router.refresh()}
              />
              <IssueCommentThread
                comments={[...initialIssue.comments].reverse()}
                dateFormat={dateFormat}
                isAdmin={isAdmin}
                issueId={initialIssue.id}
                onCommentDeleted={() => router.refresh()}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column: sidebar (above main content on mobile) */}
        {relatedIssues.length > 0 && (
          <div className="space-y-6 order-1 md:order-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Related Issues</CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
                <div className="space-y-3">
                  {relatedIssues.map((ri) => {
                    const RiTypeIcon = ISSUE_TYPE_ICONS[ri.type as IssueType];
                    const RiStatusIcon = ISSUE_STATUS_ICONS[ri.status as IssueStatus];
                    return (
                      <Link
                        key={ri.id}
                        href={`/issues/${ri.id}`}
                        className="block text-sm hover:text-primary transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">#{ri.id}</span>
                          <Badge
                            variant={getIssueTypeVariant(ri.type as IssueType)}
                            className="text-[10px] px-1.5 py-0"
                          >
                            <RiTypeIcon className="size-2.5 mr-0.5" />
                            {ISSUE_TYPE_LABELS[ri.type as IssueType]}
                          </Badge>
                          <Badge
                            variant={getIssueStatusVariant(ri.status as IssueStatus)}
                            className="text-[10px] px-1.5 py-0"
                          >
                            <RiStatusIcon className="size-2.5 mr-0.5" />
                            {ISSUE_STATUS_LABELS[ri.status as IssueStatus]}
                          </Badge>
                          {ri._count.episodes > 1 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {ri._count.episodes} eps
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {ri.user.thumbUrl ? (
                              <img
                                src={ri.user.thumbUrl}
                                alt={ri.user.username}
                                className="size-3.5 rounded-full shrink-0"
                              />
                            ) : (
                              <User className="size-3" />
                            )}
                            {ri.user.username}
                          </span>
                          <span>{formatDateWithFormat(new Date(ri.createdAt), dateFormat)}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Issue</DialogTitle>
            <DialogDescription>Update the issue details.</DialogDescription>
          </DialogHeader>
          <IssueEditForm
            issue={initialIssue}
            onSaved={() => {
              setEditDialogOpen(false);
              router.refresh();
            }}
            onCancel={() => setEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Issue #{initialIssue.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this issue and all its comments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
