/**
 * Settings utilities (server-side)
 */

import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import type { AppSettings, DateFormat } from './settings-shared';

// Re-export client-safe types and functions
export {
  type DateFormat,
  type AppSettings,
  formatDateWithFormat,
  formatDateTimeWithFormat,
  DATE_FORMAT_OPTIONS,
} from './settings-shared';

/**
 * Get app settings from database (server-side only)
 * Cached per request - multiple calls in same request only hit DB once
 */
export const getSettings = cache(async (): Promise<AppSettings> => {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  return {
    ...settings,
    dateFormat: settings.dateFormat as DateFormat,
  };
});
