'use client';

/**
 * UserMenu - Avatar dropdown for the top navigation bar
 * Shows user avatar with role and logout options
 * Only renders when Plex auth is enabled and user is logged in
 */

import { LogOut, Shield, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/contexts/auth-context';

export function UserMenu() {
  const { user, authMode, loading, logout } = useAuth();

  // Show skeleton while auth is loading (only in Plex mode)
  if (loading) {
    return <Skeleton className="size-8 rounded-full" />;
  }

  // Only show when Plex auth is enabled and user is logged in
  if (authMode !== 'plex' || !user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 rounded-full">
          {user.thumbUrl ? (
            <img
              src={user.thumbUrl}
              alt={user.username}
              className="size-7 rounded-full"
            />
          ) : (
            <User className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuItem disabled className="flex flex-col items-start gap-0.5">
          <span className="font-medium">{user.username}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="size-3" />
            {user.role === 'ADMIN' ? 'Admin' : 'User'}
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="flex items-center gap-2">
          <LogOut className="size-3" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
