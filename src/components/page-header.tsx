import * as React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

/**
 * PageHeader - Responsive page header component
 *
 * Displays page title with optional description and action button.
 * Typography scales responsively across devices.
 *
 * @example
 * // Simple
 * <PageHeader title="Settings" description="Configure preferences" />
 *
 * // With action button
 * <PageHeader
 *   title="Tasks"
 *   description="Manage tasks"
 *   action={<Button>Refresh</Button>}
 * />
 *
 * // Custom title size
 * <PageHeader
 *   title="Integrations"
 *   titleClassName="text-2xl font-semibold"
 * />
 */
export function PageHeader({
  title,
  description,
  action,
  className,
  titleClassName,
}: PageHeaderProps) {
  const hasAction = !!action;

  return (
    <header
      className={cn(
        'mb-6 md:mb-8',
        hasAction && 'flex flex-col gap-4 md:flex-row md:items-center md:justify-between',
        className
      )}
    >
      <div>
        <h1 className={cn('text-2xl md:text-3xl lg:text-4xl font-bold text-foreground', titleClassName)}>
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-2 text-sm md:text-base">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}
