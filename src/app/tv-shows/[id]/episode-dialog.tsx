'use client';

/**
 * Episode Edit Dialog
 * Edit episode details including title, status, notes, etc.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getStillUrl } from '@/lib/tmdb/images';

interface Episode {
  id: number;
  episodeNumber: number;
  title: string | null;
  status: string;
  notes: string | null;
  description: string | null;
  airDate: Date | null;
  runtime: number | null;
  stillPath: string | null;
  voteAverage: number | null;
}

interface EpisodeDialogProps {
  episode: Episode;
  seasonNumber: number;
  trigger?: React.ReactNode;
}

const STATUS_OPTIONS = [
  { value: 'TO_CHECK', label: 'To Check' },
  { value: 'GOOD', label: 'Good' },
  { value: 'BAD', label: 'Bad' },
  { value: 'DELETED', label: 'Deleted' },
  { value: 'MISSING', label: 'Missing' },
  { value: 'UNWANTED', label: 'Unwanted' },
];

export function EpisodeDialog({ episode, seasonNumber, trigger }: EpisodeDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    status: 'TO_CHECK',
    notes: '',
    description: '',
    airDate: '',
    runtime: '',
    stillPath: '',
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        title: episode.title ?? '',
        status: episode.status,
        notes: episode.notes ?? '',
        description: episode.description ?? '',
        airDate: episode.airDate
          ? new Date(episode.airDate).toISOString().split('T')[0]
          : '',
        runtime: episode.runtime?.toString() ?? '',
        stillPath: episode.stillPath ?? '',
      });
    }
  }, [open, episode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        title: formData.title || null,
        status: formData.status,
        notes: formData.notes || null,
        description: formData.description || null,
        airDate: formData.airDate || null,
        runtime: formData.runtime ? parseInt(formData.runtime, 10) : null,
        stillPath: formData.stillPath || null,
      };

      const response = await fetch(`/api/episodes/${episode.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              Edit S{String(seasonNumber).padStart(2, '0')}E
              {String(episode.episodeNumber).padStart(2, '0')}
            </DialogTitle>
            <DialogDescription>
              Update episode details and metadata.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <label htmlFor="episode-title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="episode-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Episode title..."
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="episode-status" className="text-sm font-medium">
                Status
              </label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="episode-airdate" className="text-sm font-medium">
                  Air Date
                </label>
                <Input
                  id="episode-airdate"
                  type="date"
                  value={formData.airDate}
                  onChange={(e) =>
                    setFormData({ ...formData, airDate: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="episode-runtime" className="text-sm font-medium">
                  Runtime (minutes)
                </label>
                <Input
                  id="episode-runtime"
                  type="number"
                  min="0"
                  value={formData.runtime}
                  onChange={(e) =>
                    setFormData({ ...formData, runtime: e.target.value })
                  }
                  placeholder="45"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="episode-description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="episode-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Episode description..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="episode-notes" className="text-sm font-medium">
                Notes
              </label>
              <Input
                id="episode-notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Personal notes..."
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="episode-still" className="text-sm font-medium">
                Still Path
              </label>
              <div className="flex gap-3">
                {formData.stillPath ? (
                  <div className="w-24 h-14 rounded bg-muted overflow-hidden flex-shrink-0">
                    <img
                      src={getStillUrl(formData.stillPath, 'w185') || ''}
                      alt="Still preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="size-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    id="episode-still"
                    value={formData.stillPath}
                    onChange={(e) =>
                      setFormData({ ...formData, stillPath: e.target.value })
                    }
                    placeholder="/abc123.jpg"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    TMDB still image path
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
