'use client';

/**
 * Media Info Section
 * Displays detailed FFprobe analysis results grouped by track type
 */

import { useState } from 'react';
import { HelpCircle, FileSearch, Video, AudioLines, Subtitles, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AnalyzeMediaButton } from './analyze-media-button';
import { getLanguageName, parseLanguages } from '@/lib/languages';
import { formatDateTimeWithFormat, type DateFormat } from '@/lib/settings-shared';

interface MediaTrack {
  id: number;
  trackType: 'VIDEO' | 'AUDIO' | 'SUBTITLE';
  trackIndex: number;
  codec: string | null;
  codecLong: string | null;
  width: number | null;
  height: number | null;
  bitDepth: number | null;
  frameRate: number | null;
  hdrType: string | null;
  profile: string | null;
  channels: number | null;
  channelLayout: string | null;
  sampleRate: number | null;
  language: string | null;
  title: string | null;
  bitrate: number | null;
  isDefault: boolean;
  isForced: boolean;
}

interface FileData {
  id: number;
  filename: string;
  fileExists: boolean;
  // Scanner data (from filename parsing)
  resolution: string | null;
  codec: string | null;
  // FFprobe summary data
  container: string | null;
  duration: number | null;
  bitrate: number | null;
  audioFormat: string | null;
  hdrType: string | null;
  audioLanguages: string | null;
  subtitleLanguages: string | null;
  mediaInfoExtractedAt: Date | null;
  mediaInfoError: string | null;
  metadataSource: string | null;
  // Tracks from FFprobe
  tracks?: MediaTrack[];
}

interface MediaInfoSectionProps {
  file: FileData;
  ffprobeAvailable: boolean;
  dateFormat: DateFormat;
  /** Whether the current user is an admin (controls analyze button visibility) */
  isAdmin?: boolean;
}

function LanguagePill({ code, name }: { code: string; name: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="text-xs">
            {name}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{code.toUpperCase()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function TrackBadge({ label, variant = 'outline' }: { label: string; variant?: 'outline' | 'secondary' | 'default' }) {
  return (
    <Badge variant={variant} className="text-xs font-normal">
      {label}
    </Badge>
  );
}

function MediaInfoHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-6">
          <HelpCircle className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>About Media Analysis</DialogTitle>
          <DialogDescription>
            Understanding the extracted media information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <section>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <FileSearch className="size-4" />
              What is Media Analysis?
            </h4>
            <p className="text-muted-foreground">
              Media analysis uses FFprobe to inspect your video files and extract detailed
              technical information about all video, audio, and subtitle tracks.
            </p>
          </section>

          <section>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Video className="size-4" />
              Video Information
            </h4>
            <p className="text-muted-foreground">
              Resolution, codec (H.264, HEVC, AV1), bit depth (8/10/12-bit), frame rate,
              and HDR type (HDR10, Dolby Vision, HLG).
            </p>
          </section>

          <section>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <AudioLines className="size-4" />
              Audio Information
            </h4>
            <p className="text-muted-foreground">
              Per-track codec (AAC, AC3, DTS, TrueHD), channels (stereo, 5.1, 7.1 Atmos),
              sample rate, language, and bitrate.
            </p>
          </section>

          <section>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Subtitles className="size-4" />
              Subtitle Information
            </h4>
            <p className="text-muted-foreground">
              Format (SRT, ASS, PGS), language, and forced flag per track.
            </p>
          </section>

          <section>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Info className="size-4" />
              Data Sources
            </h4>
            <div className="text-muted-foreground space-y-1">
              <p>
                <Badge variant="outline" className="mr-2">scan</Badge>
                Basic info extracted from filename during library scan
              </p>
              <p>
                <Badge variant="secondary" className="mr-2">ffprobe</Badge>
                Detailed info from actual file analysis
              </p>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatChannelLayout(channels: number | null, layout: string | null): string {
  if (layout) {
    // Common layouts
    if (layout.includes('7.1')) return '7.1';
    if (layout.includes('5.1')) return '5.1';
    if (layout.includes('stereo')) return 'Stereo';
    if (layout.includes('mono')) return 'Mono';
    return layout;
  }
  if (channels === 1) return 'Mono';
  if (channels === 2) return 'Stereo';
  if (channels === 6) return '5.1';
  if (channels === 8) return '7.1';
  if (channels) return `${channels}ch`;
  return '';
}

function formatBitrate(bitrate: number | null): string {
  if (!bitrate) return '';
  if (bitrate >= 1000000) return `${(bitrate / 1000000).toFixed(1)} Mbps`;
  if (bitrate >= 1000) return `${Math.round(bitrate / 1000)} kbps`;
  return `${bitrate} bps`;
}

export function MediaInfoSection({ file, ffprobeAvailable, dateFormat, isAdmin = false }: MediaInfoSectionProps) {
  const hasFFprobeData = !!file.mediaInfoExtractedAt;
  const tracks = file.tracks || [];

  const videoTracks = tracks.filter((t) => t.trackType === 'VIDEO');
  const audioTracks = tracks.filter((t) => t.trackType === 'AUDIO');
  const subtitleTracks = tracks.filter((t) => t.trackType === 'SUBTITLE');

  // Parse language data from summary fields (for files without detailed tracks)
  const summaryAudioLanguages = parseLanguages(file.audioLanguages);
  const summarySubtitleLanguages = parseLanguages(file.subtitleLanguages);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">Media Analysis</h4>
          <MediaInfoHelpDialog />
          {hasFFprobeData && (
            <Badge variant="secondary" className="text-xs">
              ffprobe
            </Badge>
          )}
          {!hasFFprobeData && file.metadataSource === 'scan' && (
            <Badge variant="outline" className="text-xs">
              scan only
            </Badge>
          )}
        </div>
        {isAdmin && file.fileExists && (
          <AnalyzeMediaButton
            fileId={file.id}
            filename={file.filename}
            hasExistingData={hasFFprobeData}
            ffprobeAvailable={ffprobeAvailable}
          />
        )}
      </div>

      {/* Analysis Status */}
      {hasFFprobeData && (
        <p className="text-xs text-muted-foreground">
          Last analyzed: {formatDateTimeWithFormat(file.mediaInfoExtractedAt!, dateFormat)}
        </p>
      )}

      {file.mediaInfoError && (
        <div className="text-sm text-destructive-foreground bg-destructive/10 p-2 rounded">
          Analysis error: {file.mediaInfoError}
        </div>
      )}

      {/* No analysis yet */}
      {!hasFFprobeData && !file.mediaInfoError && (
        <p className="text-sm text-muted-foreground">
          Click &quot;Analyze&quot; to extract detailed media information from this file.
        </p>
      )}

      {/* Container Info (first) */}
      {hasFFprobeData && file.container && (
        <div>
          <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Info className="size-3" />
            Container
          </h5>
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center gap-2 flex-wrap">
              <TrackBadge label={file.container.toUpperCase()} variant="secondary" />
              {file.bitrate && (
                <TrackBadge label={`Overall: ${formatBitrate(file.bitrate)}`} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video Tracks */}
      {(videoTracks.length > 0 || (hasFFprobeData && (file.resolution || file.codec))) && (
        <div>
          <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Video className="size-3" />
            Video {videoTracks.length > 0 && `(${videoTracks.length})`}
          </h5>

          {videoTracks.length > 0 ? (
            <div className="space-y-2">
              {videoTracks.map((track) => (
                <div key={track.id} className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 flex-wrap">
                    {track.width && track.height && (
                      <TrackBadge label={`${track.width}×${track.height}`} variant="secondary" />
                    )}
                    {track.codec && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <TrackBadge label={track.codec.toUpperCase()} />
                            </span>
                          </TooltipTrigger>
                          {track.codecLong && (
                            <TooltipContent>
                              <p>{track.codecLong}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {track.bitDepth && (
                      <TrackBadge label={`${track.bitDepth}-bit`} />
                    )}
                    {track.frameRate && (
                      <TrackBadge label={`${track.frameRate.toFixed(3)} fps`} />
                    )}
                    {track.hdrType && (
                      <Badge variant="default" className="text-xs bg-amber-600">
                        {track.hdrType}
                      </Badge>
                    )}
                    {track.profile && (
                      <TrackBadge label={track.profile} />
                    )}
                    {track.bitrate && (
                      <TrackBadge label={formatBitrate(track.bitrate)} />
                    )}
                    {track.isDefault && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                        Default
                      </Badge>
                    )}
                  </div>
                  {track.title && (
                    <p className="text-xs text-muted-foreground mt-1">{track.title}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Fallback to summary data
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center gap-2 flex-wrap">
                {file.resolution && <TrackBadge label={file.resolution} variant="secondary" />}
                {file.codec && <TrackBadge label={file.codec.toUpperCase()} />}
                {file.hdrType && (
                  <Badge variant="default" className="text-xs bg-amber-600">
                    {file.hdrType}
                  </Badge>
                )}
                {file.bitrate && <TrackBadge label={formatBitrate(file.bitrate)} />}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audio Tracks */}
      {(audioTracks.length > 0 || summaryAudioLanguages.length > 0 || file.audioFormat) && (
        <div>
          <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <AudioLines className="size-3" />
            Audio {audioTracks.length > 0 && `(${audioTracks.length})`}
          </h5>

          {audioTracks.length > 0 ? (
            <div className="space-y-2">
              {audioTracks.map((track) => (
                <div key={track.id} className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 flex-wrap">
                    {track.language && (
                      <LanguagePill code={track.language} name={getLanguageName(track.language)} />
                    )}
                    {track.codec && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <TrackBadge label={track.codec.toUpperCase()} />
                            </span>
                          </TooltipTrigger>
                          {track.codecLong && (
                            <TooltipContent>
                              <p>{track.codecLong}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {(track.channels || track.channelLayout) && (
                      <TrackBadge label={formatChannelLayout(track.channels, track.channelLayout)} />
                    )}
                    {track.sampleRate && (
                      <TrackBadge label={`${track.sampleRate / 1000} kHz`} />
                    )}
                    {track.bitrate && (
                      <TrackBadge label={formatBitrate(track.bitrate)} />
                    )}
                    {track.isDefault && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                        Default
                      </Badge>
                    )}
                  </div>
                  {track.title && (
                    <p className="text-xs text-muted-foreground mt-1">{track.title}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Fallback to summary data
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center gap-2 flex-wrap">
                {file.audioFormat && <TrackBadge label={file.audioFormat.toUpperCase()} />}
                {summaryAudioLanguages.map((lang) => (
                  <LanguagePill key={lang.code} code={lang.code} name={lang.name} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subtitles (condensed) */}
      {(subtitleTracks.length > 0 || summarySubtitleLanguages.length > 0) && (
        <div>
          <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Subtitles className="size-3" />
            Subtitles {subtitleTracks.length > 0 && `(${subtitleTracks.length})`}
          </h5>

          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center gap-2 flex-wrap">
              {subtitleTracks.length > 0 ? (
                subtitleTracks.map((track) => (
                  <div key={track.id} className="inline-flex items-center gap-1">
                    {track.language && (
                      <LanguagePill code={track.language} name={getLanguageName(track.language)} />
                    )}
                    {track.codec && (
                      <span className="text-xs text-muted-foreground">({track.codec.toUpperCase()})</span>
                    )}
                    {track.isForced && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-600 py-0 h-5">
                        F
                      </Badge>
                    )}
                    {track.isDefault && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-600 py-0 h-5">
                        D
                      </Badge>
                    )}
                  </div>
                ))
              ) : (
                summarySubtitleLanguages.map((lang) => (
                  <LanguagePill key={lang.code} code={lang.code} name={lang.name} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
