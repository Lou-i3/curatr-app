'use client';

/**
 * FFprobe integration help dialog
 * Explains what FFprobe does and what information it extracts
 */

import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function FfprobeHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <HelpCircle className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>About FFprobe Analysis</DialogTitle>
          <DialogDescription>
            Understanding media file analysis and what information is extracted
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <section>
            <h4 className="font-medium mb-2">What is FFprobe?</h4>
            <p className="text-muted-foreground">
              FFprobe is a multimedia stream analyzer that&apos;s part of the FFmpeg project. It
              inspects media files and extracts detailed technical information about their
              contents without modifying them.
            </p>
          </section>

          <section>
            <h4 className="font-medium mb-2">What information is extracted?</h4>
            <div className="space-y-2 text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Video:</span> Codec (H.264, HEVC,
                AV1), resolution, bit depth (8/10/12-bit), frame rate, HDR type (HDR10, Dolby
                Vision, HLG)
              </div>
              <div>
                <span className="font-medium text-foreground">Audio:</span> Codec (AAC, AC3,
                DTS), channels (stereo, 5.1, 7.1), sample rate, language, default/forced flags
              </div>
              <div>
                <span className="font-medium text-foreground">Subtitles:</span> Format (SRT,
                ASS, PGS), language, forced flag
              </div>
              <div>
                <span className="font-medium text-foreground">Container:</span> Format (MKV,
                MP4), duration, overall bitrate
              </div>
            </div>
          </section>

          <section>
            <h4 className="font-medium mb-2">Why analyze files?</h4>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Compare quality between different versions of the same content</li>
              <li>Identify files that need conversion for playback compatibility</li>
              <li>Find files with specific audio languages or subtitle tracks</li>
              <li>Verify HDR content and bit depth for your displays</li>
            </ul>
          </section>

          <section>
            <h4 className="font-medium mb-2">How to use</h4>
            <p className="text-muted-foreground">
              Navigate to any episode&apos;s detail page and click the &quot;Analyze&quot; button
              next to a file. The extracted information will be stored in the database and
              displayed on the file card.
            </p>
          </section>

          <section>
            <h4 className="font-medium mb-2">Installation paths</h4>
            <div className="space-y-1 text-muted-foreground text-xs">
              <p><span className="font-medium text-foreground">Linux:</span> /usr/bin/ffprobe</p>
              <p><span className="font-medium text-foreground">macOS (Homebrew, Apple Silicon):</span> /opt/homebrew/bin/ffprobe</p>
              <p><span className="font-medium text-foreground">macOS (Homebrew, Intel):</span> /usr/local/bin/ffprobe</p>
              <p><span className="font-medium text-foreground">Docker (Alpine):</span> /usr/bin/ffprobe</p>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
