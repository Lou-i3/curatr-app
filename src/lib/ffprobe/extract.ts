/**
 * FFprobe extraction module
 * Core logic for running ffprobe and parsing its JSON output
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { getFFprobeConfig } from './config';
import type {
  FFprobeOutput,
  FFprobeStream,
  NormalizedTrack,
  MediaSummary,
  ExtractionResult,
} from './types';
import type { TrackType } from '@/generated/prisma/client';

const execFileAsync = promisify(execFile);

/**
 * Run ffprobe on a file and return parsed JSON output
 * @throws Error if ffprobe fails or output cannot be parsed
 */
export async function runFFprobe(filepath: string): Promise<FFprobeOutput> {
  const config = getFFprobeConfig();

  const args = [
    '-v',
    'quiet',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    filepath,
  ];

  try {
    const { stdout } = await execFileAsync(config.path, args, {
      timeout: config.timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB for files with lots of metadata
    });

    return JSON.parse(stdout) as FFprobeOutput;
  } catch (error) {
    if (error instanceof Error) {
      // Check for common error patterns
      if (error.message.includes('ENOENT')) {
        throw new Error(`File not found: ${filepath}`);
      }
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        throw new Error(`FFprobe timed out analyzing: ${filepath}`);
      }
      throw new Error(`FFprobe failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Detect HDR type from video stream metadata
 */
function detectHDR(stream: FFprobeStream): string | null {
  // Check for Dolby Vision in side data
  const hasDolbyVision = stream.side_data_list?.some(
    (sd) =>
      sd.side_data_type?.toLowerCase().includes('dolby vision') ||
      sd.side_data_type?.includes('DOVI')
  );
  if (hasDolbyVision) return 'Dolby Vision';

  // Check for HDR10+ (dynamic metadata)
  const hasHDR10Plus = stream.side_data_list?.some(
    (sd) =>
      sd.side_data_type?.includes('HDR10+') ||
      sd.side_data_type?.includes('HDR Dynamic') ||
      sd.side_data_type?.includes('SMPTE ST 2094')
  );
  if (hasHDR10Plus) return 'HDR10+';

  // Check for HDR10 (PQ transfer function with static metadata)
  if (stream.color_transfer === 'smpte2084') {
    const hasMasteringDisplay = stream.side_data_list?.some(
      (sd) =>
        sd.side_data_type?.includes('Mastering display') ||
        sd.side_data_type?.includes('Content light level')
    );
    return hasMasteringDisplay ? 'HDR10' : 'PQ';
  }

  // Check for HLG
  if (stream.color_transfer === 'arib-std-b67') return 'HLG';

  return null;
}

/**
 * Detect bit depth from pixel format string
 */
function detectBitDepth(pixFmt: string | undefined): number | null {
  if (!pixFmt) return null;

  // Common 10-bit formats
  if (
    pixFmt.includes('10le') ||
    pixFmt.includes('10be') ||
    pixFmt.includes('p010') ||
    pixFmt.includes('yuv420p10') ||
    pixFmt.includes('yuv422p10') ||
    pixFmt.includes('yuv444p10')
  ) {
    return 10;
  }

  // 12-bit formats
  if (pixFmt.includes('12le') || pixFmt.includes('12be') || pixFmt.includes('p012')) {
    return 12;
  }

  // Standard 8-bit formats
  if (
    pixFmt.includes('yuv420p') ||
    pixFmt.includes('yuv422p') ||
    pixFmt.includes('yuv444p') ||
    pixFmt.includes('yuvj')
  ) {
    return 8;
  }

  return null;
}

/**
 * Parse frame rate string (e.g., "24000/1001") to float
 */
function parseFrameRate(rateStr: string | undefined): number | null {
  if (!rateStr || rateStr === '0/0') return null;

  const parts = rateStr.split('/');
  if (parts.length === 2) {
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    if (den > 0) {
      // Round to 3 decimal places (e.g., 23.976)
      return Math.round((num / den) * 1000) / 1000;
    }
  }

  const parsed = parseFloat(rateStr);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Normalize channel layout string for consistency
 */
function normalizeChannelLayout(layout: string | undefined, channels: number | undefined): string | null {
  if (layout) {
    // Clean up common ffprobe formats
    if (layout.includes('stereo')) return 'stereo';
    if (layout.includes('5.1')) return '5.1';
    if (layout.includes('7.1')) return '7.1';
    if (layout.includes('mono')) return 'mono';
    return layout.split('(')[0].trim(); // Remove parenthetical info
  }

  // Infer from channel count if layout not specified
  if (channels) {
    switch (channels) {
      case 1:
        return 'mono';
      case 2:
        return 'stereo';
      case 6:
        return '5.1';
      case 8:
        return '7.1';
      default:
        return `${channels}ch`;
    }
  }

  return null;
}

/**
 * Normalize a stream to our track format
 * Returns null for streams we don't track (data, attachments)
 */
function normalizeStream(stream: FFprobeStream): NormalizedTrack | null {
  const typeMap: Record<string, TrackType> = {
    video: 'VIDEO',
    audio: 'AUDIO',
    subtitle: 'SUBTITLE',
  };

  const trackType = typeMap[stream.codec_type];
  if (!trackType) return null; // Skip data, attachment, etc.

  return {
    trackType,
    trackIndex: stream.index,
    codec: stream.codec_name || null,
    codecLong: stream.codec_long_name || null,
    width: stream.width || null,
    height: stream.height || null,
    bitDepth: trackType === 'VIDEO' ? detectBitDepth(stream.pix_fmt) : null,
    frameRate: trackType === 'VIDEO' ? parseFrameRate(stream.r_frame_rate || stream.avg_frame_rate) : null,
    hdrType: trackType === 'VIDEO' ? detectHDR(stream) : null,
    profile: stream.profile || null,
    channels: stream.channels || null,
    channelLayout: normalizeChannelLayout(stream.channel_layout, stream.channels),
    sampleRate: stream.sample_rate ? parseInt(stream.sample_rate, 10) : null,
    language: stream.tags?.language || null,
    title: stream.tags?.title || null,
    bitrate: stream.bit_rate ? parseInt(stream.bit_rate, 10) : null,
    isDefault: stream.disposition?.default === 1,
    isForced: stream.disposition?.forced === 1,
  };
}

/**
 * Build resolution string from video dimensions
 */
function buildResolutionString(width: number | null, height: number | null): string | null {
  if (!width || !height) return null;

  // Use common resolution names for standard sizes
  if (width >= 3840) return '4K';
  if (width >= 2560) return '1440p';
  if (width >= 1920) return '1080p';
  if (width >= 1280) return '720p';
  if (width >= 720) return '480p';

  return `${width}x${height}`;
}

/**
 * Build summary from tracks for flat EpisodeFile fields
 */
function buildSummary(output: FFprobeOutput, tracks: NormalizedTrack[]): MediaSummary {
  // Find primary video track (first video, preferring default)
  const videoTrack =
    tracks.find((t) => t.trackType === 'VIDEO' && t.isDefault) ||
    tracks.find((t) => t.trackType === 'VIDEO');

  // Find primary audio track (first default, or just first)
  const audioTrack =
    tracks.find((t) => t.trackType === 'AUDIO' && t.isDefault) ||
    tracks.find((t) => t.trackType === 'AUDIO');

  // Get container format (first part of format_name)
  const formatName = output.format.format_name?.split(',')[0] || null;

  // Get unique languages for audio and subtitle tracks
  const audioLanguages = [
    ...new Set(
      tracks
        .filter((t) => t.trackType === 'AUDIO' && t.language)
        .map((t) => t.language!)
    ),
  ];

  const subtitleLanguages = [
    ...new Set(
      tracks
        .filter((t) => t.trackType === 'SUBTITLE' && t.language)
        .map((t) => t.language!)
    ),
  ];

  return {
    codec: videoTrack?.codec || null,
    resolution: buildResolutionString(videoTrack?.width || null, videoTrack?.height || null),
    bitrate: output.format.bit_rate ? parseInt(output.format.bit_rate, 10) : null,
    container: formatName,
    audioFormat: audioTrack?.codec || null,
    hdrType: videoTrack?.hdrType || null,
    duration: output.format.duration ? Math.round(parseFloat(output.format.duration)) : null,
    audioLanguages,
    subtitleLanguages,
  };
}

/**
 * Extract complete media info from a file
 * @param filepath - Path to the media file
 * @returns Extraction result with summary and track details
 */
export async function extractMediaInfo(filepath: string): Promise<ExtractionResult> {
  const output = await runFFprobe(filepath);

  const tracks = output.streams
    .map(normalizeStream)
    .filter((t): t is NormalizedTrack => t !== null);

  const summary = buildSummary(output, tracks);

  return { summary, tracks };
}
