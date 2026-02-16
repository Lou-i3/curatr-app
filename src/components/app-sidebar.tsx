'use client';

/**
 * Application sidebar using shadcn/ui Sidebar component
 * Provides navigation with collapsible and mobile-responsive behavior
 * Role-aware: hides admin-only items for regular users
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Tv, ScanSearch, Plug, Settings, ChevronRight, Film, FileSearch, AlertTriangle, Shield, History, FileVideo, PlayCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useIssueCounts } from '@/lib/contexts/issue-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { StatusIndicator } from '@/components/version-badge';
import { useVersionCheck, getVersionTooltip } from '@/hooks/use-version-check';

import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const integrationItems = [
  { name: 'TMDB', href: '/integrations/tmdb', icon: Film },
  { name: 'FFprobe', href: '/integrations/ffprobe', icon: FileSearch },
  { name: 'Plex Auth', href: '/integrations/plex', icon: Shield },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { state, setOpenMobile, isMobile } = useSidebar();
  const issueCounts = useIssueCounts();
  const { isAdmin } = useAuth();
  const version = useVersionCheck();

  const [integrationsOpen, setIntegrationsOpen] = useState(pathname.startsWith('/integrations'));

  // Auto-open integrations collapsible when navigating to an integrations page
  useEffect(() => {
    if (pathname.startsWith('/integrations')) {
      setIntegrationsOpen(true);
    }
  }, [pathname]);

  // Auto-close sidebar sheet on mobile when navigating
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile, setOpenMobile]);

  // Build navigation items based on role
  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'TV Shows', href: '/tv-shows', icon: Tv },
    ...(isAdmin ? [{ name: 'Scans', href: '/scans', icon: ScanSearch }] : []),
  ];

  return (
    <Sidebar collapsible="icon">
      {/* Navigation */}
      <SidebarContent className="pt-2">
        <SidebarMenu className="px-3.5 py-2">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}

          {/* Issues - visible to all roles */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith('/issues')}
              tooltip={issueCounts.active > 0 ? `Issues (${issueCounts.active} active)` : 'Issues'}
            >
              <Link href="/issues">
                <AlertTriangle />
                <span>Issues</span>
                {issueCounts.active > 0 && (
                  <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1 text-xs">
                    {issueCounts.active}
                  </Badge>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Files - admin only */}
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/files'}
                tooltip="Files"
              >
                <Link href="/files">
                  <FileVideo />
                  <span>Files</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {/* Playback Tests - admin only */}
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/playback-tests'}
                tooltip="Playback Tests"
              >
                <Link href="/playback-tests">
                  <PlayCircle />
                  <span>Playback Tests</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {/* Integrations with submenu - admin only */}
          {isAdmin && (
            <>
              {state === 'collapsed' ? (
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton
                        isActive={pathname.startsWith('/integrations')}
                        tooltip="Integrations"
                      >
                        <Plug />
                        <span>Integrations</span>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" sideOffset={4}>
                      {integrationItems.map((item) => (
                        <DropdownMenuItem key={item.name} asChild>
                          <Link href={item.href} className="flex items-center gap-2">
                            <item.icon className="size-4" />
                            <span>{item.name}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ) : (
                <Collapsible
                  asChild
                  open={integrationsOpen}
                  onOpenChange={setIntegrationsOpen}
                  className="group/collapsible"
                  id="sidebar-integrations"
                >
                  <SidebarMenuItem>
                    <div className="flex items-center">
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith('/integrations')}
                        className="flex-1"
                      >
                        <Link href="/integrations">
                          <Plug />
                          <span>Integrations</span>
                        </Link>
                      </SidebarMenuButton>
                      <CollapsibleTrigger asChild>
                        <button className="inline-flex size-8 items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shrink-0">
                          <ChevronRight className="size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {integrationItems.map((item) => (
                          <SidebarMenuSubItem key={item.name}>
                            <SidebarMenuSubButton asChild isActive={pathname === item.href}>
                              <Link href={item.href}>
                                <item.icon className="size-4" />
                                <span>{item.name}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
            </>
          )}


        </SidebarMenu>

        {/* Settings — admin only */}
        {isAdmin && (
          <>
            <SidebarSeparator className="mx-0" />
            <SidebarMenu className="px-3.5 py-2">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/settings'}
                  tooltip="Settings"
                >
                  <Link href="/settings">
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </>
        )}

        {/* GitHub + Version — mobile only (hidden in AppBar on mobile) */}
        {isMobile && (
          <>
            <SidebarSeparator className="mx-0" />
            <SidebarMenu className="px-3.5 py-2">
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="https://github.com/Lou-i3/curatr-app" target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    <span>GitHub</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/changelog'}
                  title={getVersionTooltip(version.status, version.latestVersion, version.currentVersion)}
                >
                  <Link href="/changelog">
                    <History />
                    <span>v{version.currentVersion}</span>
                    <StatusIndicator status={version.status} />
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
