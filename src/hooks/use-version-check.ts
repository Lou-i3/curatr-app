/**
 * Hook for checking app version against latest GitHub release
 * Extracted from VersionBadge for reuse in TopNav and sidebar
 */

import { useEffect, useState } from 'react';
import packageJson from '../../package.json';
import { useAuth } from '@/lib/contexts/auth-context';

export type UpdateStatus = 'loading' | 'up-to-date' | 'update-available' | 'no-releases' | 'error';

interface VersionState {
  status: UpdateStatus;
  currentVersion: string;
  latestVersion: string | null;
}

/**
 * Checks the current app version against the latest GitHub release.
 * Only fetches when the user is authenticated.
 */
export function useVersionCheck(): VersionState {
  const currentVersion = packageJson.version;
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [state, setState] = useState<Omit<VersionState, 'currentVersion'>>({
    status: 'loading',
    latestVersion: null,
  });

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    async function checkForUpdates() {
      try {
        const res = await fetch(
          'https://api.github.com/repos/Lou-i3/curatr-app/releases/latest',
          { headers: { 'Accept': 'application/vnd.github+json' } }
        );

        if (!res.ok) {
          setState({
            status: res.status === 404 ? 'no-releases' : 'error',
            latestVersion: null,
          });
          return;
        }

        const data = await res.json();
        const latestVersion = data.tag_name?.replace(/^v/, '') || null;

        if (!latestVersion) {
          setState({ status: 'error', latestVersion: null });
          return;
        }

        const isUpToDate = compareVersions(currentVersion, latestVersion) >= 0;
        setState({
          status: isUpToDate ? 'up-to-date' : 'update-available',
          latestVersion,
        });
      } catch {
        setState({ status: 'error', latestVersion: null });
      }
    }

    checkForUpdates();
  }, [currentVersion, authLoading, isAuthenticated]);

  return { ...state, currentVersion };
}

/**
 * Gets tooltip text for the version status
 */
export function getVersionTooltip(status: UpdateStatus, latestVersion: string | null, currentVersion: string): string {
  switch (status) {
    case 'loading':
      return `v${currentVersion} - Checking for updates...`;
    case 'up-to-date':
      return `v${currentVersion} - Up to date`;
    case 'update-available':
      return `v${currentVersion} - Update available: v${latestVersion}`;
    case 'no-releases':
      return `v${currentVersion} - No releases published yet`;
    default:
      return `v${currentVersion} - View changelog`;
  }
}

/**
 * Compare two semver versions
 * Returns: positive if a > b, negative if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
  const parseVersion = (v: string) => {
    const [main, prerelease] = v.split('-');
    const parts = main.split('.').map(Number);
    return { parts, prerelease };
  };

  const va = parseVersion(a);
  const vb = parseVersion(b);

  for (let i = 0; i < 3; i++) {
    const diff = (va.parts[i] || 0) - (vb.parts[i] || 0);
    if (diff !== 0) return diff;
  }

  if (!va.prerelease && vb.prerelease) return 1;
  if (va.prerelease && !vb.prerelease) return -1;

  return 0;
}
