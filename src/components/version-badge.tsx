'use client';

/**
 * Version badge sidebar menu item with update indicator
 * Shows current version and indicates if an update is available
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { History } from 'lucide-react';
import packageJson from '../../package.json';
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuth } from '@/lib/contexts/auth-context';

type UpdateStatus = 'loading' | 'up-to-date' | 'update-available' | 'no-releases' | 'error';

interface VersionState {
  status: UpdateStatus;
  latestVersion: string | null;
}

interface VersionBadgeProps {
  pathname: string;
}

export function VersionBadge({ pathname }: VersionBadgeProps) {
  const currentVersion = packageJson.version;
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [state, setState] = useState<VersionState>({
    status: 'loading',
    latestVersion: null,
  });

  useEffect(() => {
    // Don't fetch until auth state is resolved and user is authenticated
    if (authLoading || !isAuthenticated) return;

    async function checkForUpdates() {
      try {
        const res = await fetch(
          'https://api.github.com/repos/Lou-i3/curatr-app/releases/latest',
          {
            headers: { 'Accept': 'application/vnd.github+json' },
          }
        );

        if (!res.ok) {
          // 404 = no releases yet, other = API error
          setState({
            status: res.status === 404 ? 'no-releases' : 'error',
            latestVersion: null
          });
          return;
        }

        const data = await res.json();
        const latestVersion = data.tag_name?.replace(/^v/, '') || null;

        if (!latestVersion) {
          setState({ status: 'error', latestVersion: null });
          return;
        }

        // Simple version comparison (assumes semver format)
        const isUpToDate = compareVersions(currentVersion, latestVersion) >= 0;

        setState({
          status: isUpToDate ? 'up-to-date' : 'update-available',
          latestVersion,
        });
      } catch {
        // Network error - silently fail
        setState({ status: 'error', latestVersion: null });
      }
    }

    checkForUpdates();
  }, [currentVersion, authLoading, isAuthenticated]);

  const tooltipText = getTooltipText(state.status, state.latestVersion, currentVersion);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={pathname === '/changelog'}
        tooltip={tooltipText}
      >
        <Link href="/changelog">
          <History className="size-4" />
          <span className="flex items-center gap-1.5">
            v{currentVersion}
            <StatusIndicator status={state.status} />
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function StatusIndicator({ status }: { status: UpdateStatus }) {
  switch (status) {
    case 'loading':
      return (
        <span className="size-2 rounded-full bg-muted animate-pulse" aria-label="Checking..." />
      );
    case 'up-to-date':
      return (
        <span className="size-2 rounded-full bg-primary" aria-label="Up to date" />
      );
    case 'update-available':
      return (
        <span className="size-2 rounded-full bg-warning animate-pulse" aria-label="Update available" />
      );
    case 'no-releases':
      return (
        <span className="size-2 rounded-full bg-secondary" aria-label="No releases yet" />
      );
    case 'error':
      return (
        <span className="size-2 rounded-full bg-destructive" aria-label="Error checking updates" />
      );
    default:
      return null;
  }
}

function getTooltipText(status: UpdateStatus, latestVersion: string | null, currentVersion: string): string {
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

  // Compare major.minor.patch
  for (let i = 0; i < 3; i++) {
    const diff = (va.parts[i] || 0) - (vb.parts[i] || 0);
    if (diff !== 0) return diff;
  }

  // If main versions are equal, handle prerelease
  // A version without prerelease is greater than one with prerelease
  if (!va.prerelease && vb.prerelease) return 1;
  if (va.prerelease && !vb.prerelease) return -1;

  // Both have prerelease or both don't - treat as equal
  return 0;
}
