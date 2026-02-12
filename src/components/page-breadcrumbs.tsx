'use client';

/**
 * PageBreadcrumbs - Reusable breadcrumb trail for page content areas
 * Always starts with a Home icon linking to /, followed by the provided items.
 * The last item is rendered as the current page (not a link).
 */

import React from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export interface BreadcrumbItemDef {
  label: string;
  href?: string;
}

interface PageBreadcrumbsProps {
  items: BreadcrumbItemDef[];
  className?: string;
}

export function PageBreadcrumbs({ items, className }: PageBreadcrumbsProps) {
  return (
    <Breadcrumb className={cn('mb-2', className)}>
      <BreadcrumbList>
        {/* Home icon — always first */}
        <BreadcrumbItem>
          {items.length === 0 ? (
            <BreadcrumbPage>
              <Home className="size-3.5" />
            </BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href="/">
                <Home className="size-3.5" />
              </Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <React.Fragment key={item.label}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
