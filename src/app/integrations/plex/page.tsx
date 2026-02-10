'use client';

/**
 * Plex Authentication Integration page
 * Shows auth mode status, Plex server connectivity, and user stats
 * Explains how to configure and enable Plex authentication
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Users,
  Shield,
  Server,
  Key,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout';

interface AuthStatus {
  authMode: 'none' | 'plex';
  plexConfigured: boolean;
  plexUrl: string | null;
  serverReachable: boolean;
  users: number;
  activeSessions: number;
}

export default function PlexAuthIntegrationPage() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await fetch('/api/auth/status');
      if (!response.ok) throw new Error('Failed to fetch status');
      setStatus(await response.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <PageContainer maxWidth="wide">
        <div className="flex items-center gap-4 mb-6 md:mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/integrations"><ArrowLeft className="size-4" /></Link>
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </PageContainer>
    );
  }

  const isEnabled = status?.authMode === 'plex';
  const isConfigured = status?.plexConfigured ?? false;
  const isReachable = status?.serverReachable ?? false;

  return (
    <PageContainer maxWidth="wide">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 md:mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/integrations"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.643 0L2.805 24H12.357L21.195 0H11.643Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold">Plex Authentication</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Multi-user access with Plex account login
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`size-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive mb-6 md:mb-8">
          <CardContent className="p-4 flex items-center gap-2 text-sm text-destructive-foreground">
            <AlertCircle className="size-4" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Status Overview */}
      <div className="grid gap-4 md:gap-6 md:grid-cols-2 mb-6 md:mb-8">
        {/* Auth Mode Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="size-4" />
                Authentication Mode
              </CardTitle>
              {isEnabled ? (
                <Badge variant="success">Enabled</Badge>
              ) : (
                <Badge variant="outline">Disabled</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEnabled ? (
              <p className="text-sm text-muted-foreground">
                Plex authentication is active. Users must sign in with a Plex account that has access to your server.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Authentication is currently disabled. The app runs in single-user mode with full admin access.
                </p>
                {isConfigured && (
                  <p className="text-sm text-muted-foreground">
                    Plex credentials are configured. Set <code className="text-xs bg-muted px-1 py-0.5 rounded">AUTH_MODE=plex</code> in your environment to enable multi-user login.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Server Connection Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="size-4" />
                Plex Server
              </CardTitle>
              {!isConfigured ? (
                <Badge variant="outline">Not Configured</Badge>
              ) : isReachable ? (
                <Badge variant="success">Reachable</Badge>
              ) : (
                <Badge variant="destructive">Unreachable</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {status?.plexUrl ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  {isReachable ? (
                    <CheckCircle2 className="size-4 text-success-foreground" />
                  ) : (
                    <XCircle className="size-4 text-destructive-foreground" />
                  )}
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{status.plexUrl}</code>
                </div>
                {!isReachable && (
                  <p className="text-sm text-muted-foreground">
                    Cannot reach the Plex server. Check that it&apos;s running and the URL is correct.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No Plex server URL configured. Set <code className="text-xs bg-muted px-1 py-0.5 rounded">PLEX_URL</code> in your environment.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Users Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4" />
              Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted p-2 rounded">
                <p className="text-muted-foreground text-xs">Plex Users</p>
                <p className="text-lg font-semibold">{status?.users ?? 0}</p>
              </div>
              <div className="bg-muted p-2 rounded">
                <p className="text-muted-foreground text-xs">Active Sessions</p>
                <p className="text-lg font-semibold">{status?.activeSessions ?? 0}</p>
              </div>
            </div>
            {isEnabled && (status?.users ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Manage users in{' '}
                <Link href="/settings" className="text-primary hover:underline">Settings</Link>.
              </p>
            )}
          </CardContent>
        </Card>

        {/* API Token Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="size-4" />
                Server Token
              </CardTitle>
              {isConfigured ? (
                <Badge variant="success">Configured</Badge>
              ) : (
                <Badge variant="outline">Missing</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isConfigured ? (
              <p className="text-sm text-muted-foreground">
                Server token is set. Used to verify user access to your Plex server.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Set <code className="text-xs bg-muted px-1 py-0.5 rounded">PLEX_TOKEN</code> in your environment. Find it in Plex Web via Get Info &rarr; View XML.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Setup Guide */}
      {!isEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Setup Guide</CardTitle>
            <CardDescription>
              Enable multi-user access so your Plex users can log in, browse the library, and report issues.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <SetupStep
                number={1}
                title="Set your Plex server URL"
                done={!!status?.plexUrl}
              >
                <p className="text-sm text-muted-foreground">
                  Add <code className="text-xs bg-muted px-1 py-0.5 rounded">PLEX_URL=http://your-server:32400</code> to your environment variables or <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code> file.
                </p>
              </SetupStep>

              <SetupStep
                number={2}
                title="Set your Plex token"
                done={isConfigured}
              >
                <p className="text-sm text-muted-foreground">
                  Add <code className="text-xs bg-muted px-1 py-0.5 rounded">PLEX_TOKEN=your-token</code> to your environment. To find your token: open Plex Web, navigate to any item, click <strong>&hellip;</strong> &rarr; <strong>Get Info</strong> &rarr; <strong>View XML</strong>. The token is in the URL as <code className="text-xs bg-muted px-1 py-0.5 rounded">X-Plex-Token=...</code>
                </p>
              </SetupStep>

              <SetupStep
                number={3}
                title="Enable Plex authentication"
                done={isEnabled}
              >
                <p className="text-sm text-muted-foreground">
                  Set <code className="text-xs bg-muted px-1 py-0.5 rounded">AUTH_MODE=plex</code> in your environment and restart the app. The login page will appear automatically.
                </p>
              </SetupStep>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  The Plex server owner is automatically promoted to admin. Other Plex users with access to your server can sign in as regular users. Admin controls are available in{' '}
                  <Link href="/settings" className="text-primary hover:underline">Settings</Link>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* How It Works (when enabled) */}
      {isEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Login:</strong> Users click &ldquo;Sign in with Plex&rdquo; and authorize via their Plex account. Only users with access to your configured server can sign in.
              </p>
              <p>
                <strong className="text-foreground">Roles:</strong> The Plex server owner is automatically an admin. Other users are regular users who can browse the library and report issues, but cannot change settings or edit metadata.
              </p>
              <p>
                <strong className="text-foreground">Sessions:</strong> Login sessions last 30 days. Admins can deactivate users or revoke access in{' '}
                <Link href="/settings" className="text-primary hover:underline">Settings &rarr; Users</Link>.
              </p>
              <p>
                <strong className="text-foreground">Disabling:</strong> To return to single-user mode, set <code className="text-xs bg-muted px-1 py-0.5 rounded">AUTH_MODE=none</code> and restart. All user data is preserved.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}

function SetupStep({
  number,
  title,
  done,
  children,
}: {
  number: number;
  title: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className={`flex size-6 items-center justify-center rounded-full text-xs font-medium flex-shrink-0 mt-0.5 ${
        done
          ? 'bg-success text-success-foreground'
          : 'bg-muted text-muted-foreground'
      }`}>
        {done ? <CheckCircle2 className="size-3.5" /> : number}
      </div>
      <div>
        <p className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : ''}`}>
          {title}
        </p>
        {!done && <div className="mt-1">{children}</div>}
      </div>
    </div>
  );
}
