'use client';

/**
 * AdminGuard — Blocks non-admin users from accessing admin-only pages.
 * Shows a forbidden message with a link back to the dashboard.
 */

import { useAuth } from '@/lib/contexts/auth-context';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { isAdmin, loading } = useAuth();

  // During loading, isAdmin defaults to true to prevent flash — show nothing extra
  if (loading) return null;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <ShieldAlert className="size-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Access Denied</h1>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          This page requires administrator privileges.
        </p>
        <Button asChild>
          <Link href="/">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
