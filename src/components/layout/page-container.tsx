import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  maxWidth?: 'narrow' | 'default' | 'wide' | 'full';
  className?: string;
}

/**
 * PageContainer - Flexible wrapper for all page content
 *
 * Provides consistent responsive padding and optional max-width constraints.
 * Works with any content type: tables, cards, forms, grids.
 *
 * @param maxWidth - Width constraint:
 *   - narrow (max-w-3xl): Forms, settings
 *   - default (max-w-5xl): Most pages
 *   - wide (max-w-7xl): Data tables, wide content
 *   - full: No constraint (TV shows, integrations)
 *
 * @example
 * <PageContainer maxWidth="default">
 *   <PageHeader title="Dashboard" />
 *   <ContentSection>...</ContentSection>
 * </PageContainer>
 */
export function PageContainer({
  children,
  maxWidth = 'default',
  className,
}: PageContainerProps) {
  const maxWidthClasses = {
    narrow: 'max-w-3xl',
    default: 'max-w-5xl',
    wide: 'max-w-7xl',
    full: '',
  };

  return (
    <div
      className={cn(
        'px-4 py-4 md:px-8 md:py-6',
        maxWidth !== 'full' && 'mx-auto',
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </div>
  );
}
