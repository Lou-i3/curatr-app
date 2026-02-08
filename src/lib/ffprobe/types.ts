/**
 * FFprobe type definitions
 * Interfaces for raw ffprobe JSON output and normalized data structures
 */

import type { TrackType } from '@/generated/prisma/client';

// ============================================================================
// Raw FFprobe JSON Output Types
// ============================================================================

/** Raw format section from ffprobe JSON output */
export interface FFprobeFormat {
  filename: string;
  nb_streams: number;
  nb_programs: number;
  format_name: string; // e.g., "matroska,webm"
  format_long_name: string;
  start_time?: string;
  duration?: string; // seconds as string
  size?: string; // bytes as string
  bit_rate?: string; // bits/sec as string
  probe_score: number;
  tags?: Record<string, string>;
}

/** Disposition flags for a stream */
export interface FFprobeDisposition {
  default: number;
  dub: number;
  original: number;
  comment: number;
  lyrics: number;
  karaoke: number;
  forced: number;
  hearing_impaired: number;
  visual_impaired: number;
  clean_effects: number;
  attached_pic: number;
  timed_thumbnails: number;
}

/** Side data entry (contains HDR metadata) */
export interface FFprobeSideData {
  side_data_type: string;
  // HDR-specific fields may be present
  [key: string]: unknown;
}

/** Raw stream section from ffprobe JSON output */
export interface FFprobeStream {
  index: number;
  codec_name?: string;
  codec_long_name?: string;
  profile?: string;
  codec_type: 'video' | 'audio' | 'subtitle' | 'data' | 'attachment';
  codec_tag_string?: string;
  codec_tag?: string;

  // Video-specific
  width?: number;
  height?: number;
  coded_width?: number;
  coded_height?: number;
  closed_captions?: number;
  has_b_frames?: number;
  sample_aspect_ratio?: string;
  display_aspect_ratio?: string;
  pix_fmt?: string; // e.g., "yuv420p10le" indicates 10-bit
  level?: number;
  color_range?: string;
  color_space?: string;
  color_transfer?: string; // "smpte2084" = PQ (HDR10), "arib-std-b67" = HLG
  color_primaries?: string;
  chroma_location?: string;
  field_order?: string;
  refs?: number;
  r_frame_rate?: string; // e.g., "24000/1001"
  avg_frame_rate?: string;

  // Audio-specific
  sample_fmt?: string;
  sample_rate?: string;
  channels?: number;
  channel_layout?: string; // e.g., "stereo", "5.1(side)"
  bits_per_sample?: number;

  // Common
  time_base?: string;
  start_pts?: number;
  start_time?: string;
  duration_ts?: number;
  duration?: string;
  bit_rate?: string;
  max_bit_rate?: string;
  bits_per_raw_sample?: string;
  nb_frames?: string;
  disposition?: FFprobeDisposition;
  tags?: {
    language?: string;
    title?: string;
    handler_name?: string;
    [key: string]: string | undefined;
  };
  side_data_list?: FFprobeSideData[];
}

/** Complete ffprobe JSON output structure */
export interface FFprobeOutput {
  format: FFprobeFormat;
  streams: FFprobeStream[];
}

// ============================================================================
// Normalized Data Types (for database storage)
// ============================================================================

/** Normalized track data ready for database insertion */
export interface NormalizedTrack {
  trackType: TrackType;
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

/** Summary data for flat EpisodeFile fields */
export interface MediaSummary {
  codec: string | null;
  resolution: string | null;
  bitrate: number | null;
  container: string | null;
  audioFormat: string | null;
  hdrType: string | null;
  duration: number | null;
  audioLanguages: string[];
  subtitleLanguages: string[];
}

/** Complete extraction result */
export interface ExtractionResult {
  summary: MediaSummary;
  tracks: NormalizedTrack[];
}
