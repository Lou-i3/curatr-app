/**
 * Playback Status Utilities
 *
 * Handles computation of file quality based on playback test results.
 * - VERIFIED: All required platforms have PASS
 * - BROKEN: Any required platform has FAIL
 * - UNVERIFIED: Missing tests or no required platforms configured
 */

import { prisma } from '@/lib/prisma';
import type { FileQuality, PlaybackStatus } from '@/generated/prisma/client';

interface TestResult {
  platformId: number;
  status: PlaybackStatus;
}

/**
 * Compute file quality based on playback test results
 *
 * @param tests - Array of test results for the file
 * @param requiredPlatformIds - IDs of platforms that must pass for VERIFIED status
 * @returns The computed FileQuality value
 */
export function computeFileQualityFromTests(
  tests: TestResult[],
  requiredPlatformIds: number[]
): FileQuality {
  // If no required platforms configured, stay UNVERIFIED
  if (requiredPlatformIds.length === 0) {
    return 'UNVERIFIED';
  }

  // Group tests by platform, keeping only the most recent test per platform
  // (assuming tests are sorted by testedAt desc, the first one is most recent)
  const latestTestByPlatform = new Map<number, PlaybackStatus>();
  for (const test of tests) {
    if (!latestTestByPlatform.has(test.platformId)) {
      latestTestByPlatform.set(test.platformId, test.status);
    }
  }

  // Check each required platform
  let hasAllRequired = true;
  let hasAnyFail = false;

  for (const platformId of requiredPlatformIds) {
    const status = latestTestByPlatform.get(platformId);

    if (!status) {
      // Required platform not tested yet
      hasAllRequired = false;
    } else if (status === 'FAIL') {
      hasAnyFail = true;
    } else if (status !== 'PASS') {
      // Unknown status, treat as not tested
      hasAllRequired = false;
    }
  }

  // BROKEN if any required platform fails
  if (hasAnyFail) {
    return 'BROKEN';
  }

  // VERIFIED if all required platforms pass
  if (hasAllRequired) {
    return 'VERIFIED';
  }

  // Otherwise UNVERIFIED
  return 'UNVERIFIED';
}

/**
 * Recompute and update a file's quality based on its playback tests
 *
 * @param fileId - The ID of the file to recompute quality for
 */
export async function recomputeFileQuality(fileId: number): Promise<void> {
  // Get all tests for this file
  const tests = await prisma.playbackTest.findMany({
    where: { episodeFileId: fileId },
    orderBy: { testedAt: 'desc' },
    select: {
      platformId: true,
      status: true,
    },
  });

  // Get all required platform IDs
  const requiredPlatforms = await prisma.platform.findMany({
    where: { isRequired: true },
    select: { id: true },
  });
  const requiredPlatformIds = requiredPlatforms.map((p) => p.id);

  // Compute the new quality
  const newQuality = computeFileQualityFromTests(tests, requiredPlatformIds);

  // Get current quality
  const file = await prisma.episodeFile.findUnique({
    where: { id: fileId },
    select: { quality: true },
  });

  // Only update if quality actually changed
  if (file && file.quality !== newQuality) {
    await prisma.episodeFile.update({
      where: { id: fileId },
      data: { quality: newQuality },
    });
  }
}

/**
 * Get the latest test result for each platform for a file
 *
 * @param fileId - The ID of the file
 * @returns Map of platformId to latest test status
 */
export async function getLatestTestsByPlatform(
  fileId: number
): Promise<Map<number, { status: PlaybackStatus; testedAt: Date; notes: string | null }>> {
  const tests = await prisma.playbackTest.findMany({
    where: { episodeFileId: fileId },
    orderBy: { testedAt: 'desc' },
    select: {
      platformId: true,
      status: true,
      testedAt: true,
      notes: true,
    },
  });

  const latestByPlatform = new Map<
    number,
    { status: PlaybackStatus; testedAt: Date; notes: string | null }
  >();

  for (const test of tests) {
    if (!latestByPlatform.has(test.platformId)) {
      latestByPlatform.set(test.platformId, {
        status: test.status,
        testedAt: test.testedAt,
        notes: test.notes,
      });
    }
  }

  return latestByPlatform;
}
