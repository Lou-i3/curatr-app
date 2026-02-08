'use client';

/**
 * Plex sign-in button with PIN-based auth flow
 * Creates a PIN, opens Plex auth in new window, polls for completion
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

type LoginState = 'idle' | 'creating-pin' | 'waiting' | 'authenticating' | 'error';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function PlexLoginButton() {
  const router = useRouter();
  const [state, setState] = useState<LoginState>('idle');
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const authWindowRef = useRef<Window | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const handleLogin = useCallback(async () => {
    setError(null);
    setState('creating-pin');

    try {
      // Create a Plex PIN
      const pinResponse = await fetch('/api/auth/plex/pin', { method: 'POST' });

      if (!pinResponse.ok) {
        const data = await pinResponse.json();
        throw new Error(data.error || 'Failed to start authentication');
      }

      const { pinId, authUrl } = await pinResponse.json();

      // Open Plex auth in a new window
      authWindowRef.current = window.open(authUrl, 'plex-auth', 'width=800,height=600');
      setState('waiting');

      // Start polling for PIN completion
      const startTime = Date.now();

      pollIntervalRef.current = setInterval(async () => {
        // Check timeout
        if (Date.now() - startTime > POLL_TIMEOUT_MS) {
          stopPolling();
          setState('error');
          setError('Authentication timed out. Please try again.');
          return;
        }

        try {
          const callbackResponse = await fetch('/api/auth/plex/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pinId }),
          });

          const data = await callbackResponse.json();

          if (data.status === 'pending') {
            // Still waiting for user to approve
            return;
          }

          if (data.status === 'authenticated') {
            // Success — stop polling and redirect
            stopPolling();
            authWindowRef.current?.close();
            setState('authenticating');
            router.push('/');
            router.refresh();
            return;
          }

          if (data.error) {
            // Auth failed (no access, deactivated, etc.)
            stopPolling();
            authWindowRef.current?.close();
            setState('error');
            setError(data.error);
            return;
          }
        } catch {
          // Network error — keep polling
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  }, [router, stopPolling]);

  const handleRetry = useCallback(() => {
    stopPolling();
    setState('idle');
    setError(null);
  }, [stopPolling]);

  const isLoading = state === 'creating-pin' || state === 'waiting' || state === 'authenticating';

  return (
    <div className="space-y-4">
      <Button
        onClick={state === 'error' ? handleRetry : handleLogin}
        disabled={isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {state === 'idle' && 'Sign in with Plex'}
        {state === 'creating-pin' && 'Connecting to Plex...'}
        {state === 'waiting' && 'Waiting for Plex approval...'}
        {state === 'authenticating' && 'Signing in...'}
        {state === 'error' && 'Try Again'}
      </Button>

      {state === 'waiting' && (
        <p className="text-center text-xs text-muted-foreground">
          A Plex window should have opened. Sign in there and approve access.
        </p>
      )}

      {error && (
        <p className="text-center text-sm text-destructive-foreground">{error}</p>
      )}
    </div>
  );
}
