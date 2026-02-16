'use client';

/**
 * AppBar - Full-width application header bar
 * Spans the entire page above both sidebar and content.
 * Mobile: sidebar trigger + logo + user menu
 * Desktop: sidebar trigger + logo + app name + GitHub + version + user menu
 */

import Link from 'next/link';
import Image from 'next/image';
import { History, Loader2, ListTodo } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { UserMenu } from '@/components/user-menu';
import { StatusIndicator } from '@/components/version-badge';
import { useVersionCheck, getVersionTooltip } from '@/hooks/use-version-check';
import { useTaskCounts } from '@/lib/contexts/task-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { useTasksPanel } from '@/components/tasks/tasks-panel';

export function AppBar() {
  const version = useVersionCheck();
  const { isAdmin } = useAuth();
  const taskCounts = useTaskCounts();
  const { setOpen: openTasksPanel } = useTasksPanel();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-12 items-center border-b bg-background pl-4 pr-4 md:pr-6 pointer-events-auto">
      {/* Left: sidebar toggle + logo + app name */}
      <div className="flex items-center gap-2">
        {/* stopPropagation prevents Radix Dialog dismiss racing with toggle when mobile Sheet is open */}
        <SidebarTrigger onPointerDown={(e) => e.stopPropagation()} />
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Curatr" width={24} height={24} />
          <span className="font-semibold text-sm md:text-lg">Curatr App</span>
        </Link>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: GitHub + version + tasks indicator + user menu */}
      <div className="flex items-center gap-3">
        <a
          href="https://github.com/Lou-i3/curatr-app"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:block text-muted-foreground hover:text-foreground transition-colors"
          title="GitHub"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        </a>

        <Separator orientation="vertical" className="h-4 hidden md:block" />

        <Link
          href="/changelog"
          className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          title={getVersionTooltip(version.status, version.latestVersion, version.currentVersion)}
        >
          <History className="size-3.5" />
          <span>v{version.currentVersion}</span>
          <StatusIndicator status={version.status} />
        </Link>

        <Separator orientation="vertical" className="h-4 hidden md:block" />

        {/* Task activity indicator - admin only, always visible */}
        {isAdmin && (
          <>
            <Separator orientation="vertical" className="h-4 md:hidden" />
            <button
              onClick={() => openTasksPanel(true)}
              className="relative flex items-center text-muted-foreground hover:text-foreground transition-colors"
              title={taskCounts.total > 0 ? `${taskCounts.running} running, ${taskCounts.pending} queued` : 'Tasks'}
            >
              {taskCounts.total > 0 ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span className="absolute -top-1.5 -right-2 flex items-center justify-center h-3.5 min-w-3.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium leading-none px-0.5">
                    {taskCounts.total}
                  </span>
                </>
              ) : (
                <ListTodo className="size-4" />
              )}
            </button>
            <Separator orientation="vertical" className="h-4" />
          </>
        )}

        <UserMenu />
      </div>
    </header>
  );
}
