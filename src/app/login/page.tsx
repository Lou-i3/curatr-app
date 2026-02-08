/**
 * Login page — shown when AUTH_MODE=plex and user has no session
 * Clean centered layout with Plex sign-in button
 */

import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getSession, isAuthEnabled } from '@/lib/auth';
import { PlexLoginButton } from './plex-login-button';

export default async function LoginPage() {
  // If auth is not enabled, redirect to home
  if (!isAuthEnabled()) {
    redirect('/');
  }

  // If already authenticated, redirect to home
  const session = await getSession();
  if (session) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-8 px-4">
        {/* Logo & Brand */}
        <div className="flex flex-col items-center space-y-4">
          <Image
            src="/logo.png"
            alt="Curatr App"
            width={64}
            height={64}
          />
          <h1 className="text-3xl font-bold">Curatr App</h1>
          <p className="text-center text-sm text-muted-foreground">
            Sign in with your Plex account to browse your library and report issues.
          </p>
        </div>

        {/* Login Button */}
        <PlexLoginButton />
      </div>
    </div>
  );
}
