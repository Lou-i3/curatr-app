'use client';

/**
 * User Management — admin section for managing users
 * Only visible when AUTH_MODE=plex
 * Shows DataTable of users with role/active toggle actions
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/data-table';
import { useAuth } from '@/lib/contexts/auth-context';
import type { DateFormat } from '@/lib/settings-shared';
import type { UserRole } from '@/generated/prisma/client';
import { getUserColumns, type UserRow } from './user-columns';

interface UserManagementProps {
  dateFormat: DateFormat;
}

export function UserManagement({ dateFormat }: UserManagementProps) {
  const { user: currentUser, authMode } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      setUsers(await response.json());
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authMode === 'plex') {
      fetchUsers();
    }
  }, [authMode, fetchUsers]);

  const handleRoleChange = useCallback(async (userId: number, role: UserRole) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update role');
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
      toast.success(`User ${role === 'ADMIN' ? 'promoted to admin' : 'demoted to user'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
    }
  }, []);

  const handleActiveChange = useCallback(async (userId: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive } : u))
      );
      toast.success(`User ${isActive ? 'reactivated' : 'deactivated'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  }, []);

  const columns = useMemo(
    () =>
      getUserColumns({
        dateFormat,
        currentUserId: currentUser?.id ?? null,
        onRoleChange: handleRoleChange,
        onActiveChange: handleActiveChange,
      }),
    [dateFormat, currentUser?.id, handleRoleChange, handleActiveChange]
  );

  // Only shown in plex auth mode
  if (authMode !== 'plex') return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>
          Manage user access and roles. Deactivating a user blocks their login and revokes existing sessions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No users yet. Users will appear here after logging in with their Plex account.
          </p>
        ) : (
          <DataTable columns={columns} data={users} />
        )}
      </CardContent>
    </Card>
  );
}
