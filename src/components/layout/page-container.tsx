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
 *   - narrow (max-w-3xl): Centered forms, settings
 *   - default (max-w-5xl): Centered content
 *   - wide: No constraint — fills available space (most pages)
 *   - full: No constraint (alias for wide)
 *
 * @example
 * <PageContainer maxWidth="wide">
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
    wide: '',
    full: '',
  };

  const shouldCenter = maxWidth === 'narrow' || maxWidth === 'default';

  return (
    <div
      className={cn(
        'px-4 py-4 md:px-8 md:py-6',
        shouldCenter && 'mx-auto',
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </div>
  );
}
