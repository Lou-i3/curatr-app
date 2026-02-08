'use client';

/**
 * User Management Table Column Definitions
 * Defines columns for the users DataTable with role toggle and active status
 */

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { formatDateTimeWithFormat, type DateFormat } from '@/lib/settings-shared';
import { User, Shield, ShieldOff, UserCheck, UserX } from 'lucide-react';
import type { UserRole } from '@/generated/prisma/client';

export interface UserRow {
  id: number;
  plexId: string;
  username: string;
  email: string | null;
  thumbUrl: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  _count: { reportedIssues: number };
}

interface ColumnOptions {
  dateFormat: DateFormat;
  currentUserId: number | null;
  onRoleChange: (userId: number, role: UserRole) => Promise<void>;
  onActiveChange: (userId: number, isActive: boolean) => Promise<void>;
}

/** Build user columns dynamically */
export function getUserColumns({
  dateFormat,
  currentUserId,
  onRoleChange,
  onActiveChange,
}: ColumnOptions): ColumnDef<UserRow>[] {
  return [
    // Avatar + Username
    {
      accessorKey: 'username',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-2">
            {user.thumbUrl ? (
              <img src={user.thumbUrl} alt="" className="size-6 rounded-full" />
            ) : (
              <User className="size-5 text-muted-foreground" />
            )}
            <div>
              <span className="font-medium text-sm">{user.username}</span>
              {user.id === currentUserId && (
                <span className="text-xs text-muted-foreground ml-1.5">(you)</span>
              )}
              {user.plexId === 'local' && (
                <span className="text-xs text-muted-foreground ml-1.5">(system)</span>
              )}
            </div>
          </div>
        );
      },
    },
    // Email
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.email || '—'}
        </span>
      ),
    },
    // Role
    {
      accessorKey: 'role',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
            {user.role === 'ADMIN' ? 'Admin' : 'User'}
          </Badge>
        );
      },
    },
    // Active status
    {
      accessorKey: 'isActive',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <Badge variant={user.isActive ? 'success' : 'outline'}>
            {user.isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    // Issues reported
    {
      id: 'issueCount',
      accessorFn: (row) => row._count.reportedIssues,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Issues" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original._count.reportedIssues}
        </span>
      ),
    },
    // Last login
    {
      accessorKey: 'lastLoginAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Login" />
      ),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {user.lastLoginAt
              ? formatDateTimeWithFormat(new Date(user.lastLoginAt), dateFormat)
              : '—'}
          </span>
        );
      },
    },
    // Actions
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const user = row.original;
        const isSelf = user.id === currentUserId;
        const isSystem = user.plexId === 'local';
        const canModify = !isSelf && !isSystem;

        if (!canModify) return null;

        return (
          <div className="flex justify-end gap-1">
            {/* Toggle role */}
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              title={user.role === 'ADMIN' ? 'Demote to User' : 'Promote to Admin'}
              onClick={() =>
                onRoleChange(user.id, user.role === 'ADMIN' ? 'USER' : 'ADMIN')
              }
            >
              {user.role === 'ADMIN' ? (
                <ShieldOff className="size-3.5 text-muted-foreground" />
              ) : (
                <Shield className="size-3.5 text-muted-foreground" />
              )}
            </Button>
            {/* Toggle active */}
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              title={user.isActive ? 'Deactivate user' : 'Reactivate user'}
              onClick={() => onActiveChange(user.id, !user.isActive)}
            >
              {user.isActive ? (
                <UserX className="size-3.5 text-muted-foreground" />
              ) : (
                <UserCheck className="size-3.5 text-muted-foreground" />
              )}
            </Button>
          </div>
        );
      },
      enableSorting: false,
    },
  ];
}
