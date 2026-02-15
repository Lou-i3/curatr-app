'use client';

/**
 * BadgeSelector - A clickable badge that opens a dropdown to change status values
 * Uses optimistic updates for immediate feedback while API calls complete in background
 * Supports optional cascade confirmation dialog for hierarchical entities
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2 } from 'lucide-react';
import type { BadgeVariant } from '@/lib/status';

interface CascadeOptions {
  /** Type of entity (for API endpoint) */
  entityType: 'show' | 'season' | 'episode';
  /** Entity ID for API calls */
  entityId: number;
  /** Whether entity has children to cascade to */
  hasChildren?: boolean;
  /** API endpoint base path (e.g., '/api/tv-shows') */
  apiEndpoint: string;
  /** Property key to send in API body (e.g., 'monitorStatus', 'quality') */
  propertyKey: string;
  /** Singular label for the entity (e.g., 'season') */
  entityLabel: string;
  /** Label for the children (e.g., 'episodes') */
  childrenLabel: string;
  /** Function to get display text for confirmation (e.g., "Wanted" or "Unwanted") */
  getConfirmationText: (value: string) => string;
}

interface BadgeSelectorProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  displayLabel: string;
  variant: BadgeVariant;
  onValueChange: (value: T) => void | Promise<void>;
  getVariant?: (value: T) => BadgeVariant;
  cascadeOptions?: CascadeOptions;
  onUpdate?: () => void;
  disabled?: boolean;
  className?: string;
}

export function BadgeSelector<T extends string>({
  value,
  options,
  displayLabel,
  variant,
  onValueChange,
  getVariant,
  cascadeOptions,
  onUpdate,
  disabled = false,
  className,
}: BadgeSelectorProps<T>) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [cascadeDialogOpen, setCascadeDialogOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState<T | null>(null);

  // Local state for optimistic updates
  const [localValue, setLocalValue] = useState(value);
  const [localLabel, setLocalLabel] = useState(displayLabel);
  const [localVariant, setLocalVariant] = useState(variant);

  // Sync with props when they change (after router.refresh())
  useEffect(() => {
    setLocalValue(value);
    setLocalLabel(displayLabel);
    setLocalVariant(variant);
  }, [value, displayLabel, variant]);

  const handleSelect = async (newValue: T) => {
    if (newValue === localValue) {
      setDropdownOpen(false);
      return;
    }

    // If cascade options provided and entity has children, show confirmation dialog
    if (cascadeOptions?.hasChildren && cascadeOptions.entityType !== 'episode') {
      setPendingValue(newValue);
      setDropdownOpen(false);
      setCascadeDialogOpen(true);
      return;
    }

    // Otherwise, update directly
    await performUpdate(newValue, false);
  };

  const performUpdate = async (newValue: T, cascade: boolean) => {
    // Find the option to get its label
    const option = options.find((o) => o.value === newValue);
    if (!option) return;

    // Optimistic update - show new value immediately
    setLocalValue(newValue);
    setLocalLabel(option.label);
    if (getVariant) {
      setLocalVariant(getVariant(newValue));
    }

    setLoading(true);
    setDropdownOpen(false);

    try {
      // If cascade options provided, use API endpoint
      if (cascadeOptions) {
        const response = await fetch(`${cascadeOptions.apiEndpoint}/${cascadeOptions.entityId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [cascadeOptions.propertyKey]: newValue, cascade }),
        });

        if (response.ok) {
          router.refresh();
          onUpdate?.();
        } else {
          throw new Error('Failed to update');
        }
      } else {
        // Otherwise, use the provided callback
        const result = onValueChange(newValue);
        if (result instanceof Promise) {
          await result;
        }
      }
    } catch {
      // Revert on error
      setLocalValue(value);
      setLocalLabel(displayLabel);
      setLocalVariant(variant);
    } finally {
      setLoading(false);
      setCascadeDialogOpen(false);
      setPendingValue(null);
    }
  };

  const handleCascadeConfirm = (cascade: boolean) => {
    if (pendingValue) {
      performUpdate(pendingValue, cascade);
    }
  };

  // Non-admin users see a static badge with no interactivity
  if (!isAdmin) {
    return (
      <Badge variant={localVariant} className={className}>
        {localLabel}
      </Badge>
    );
  }

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild disabled={disabled || loading}>
          <span
            role="button"
            tabIndex={0}
            className="inline-flex focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Badge
              variant={localVariant}
              className={`cursor-pointer hover:opacity-80 transition-opacity ${className ?? ''}`}
            >
              {loading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                localLabel
              )}
            </Badge>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={option.value === localValue ? 'bg-accent' : ''}
            >
              <Badge variant={getVariant?.(option.value) ?? 'outline'} className="mr-2">
                {option.label}
              </Badge>
              {option.value === localValue && (
                <span className="ml-auto text-xs text-muted-foreground">Current</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Optional Cascade Confirmation Dialog */}
      {cascadeOptions && (
        <Dialog open={cascadeDialogOpen} onOpenChange={setCascadeDialogOpen}>
          <DialogContent onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>
                {pendingValue && cascadeOptions.getConfirmationText(pendingValue)}
              </DialogTitle>
              <DialogDescription>
                Do you want to apply this change to all {cascadeOptions.childrenLabel} as well?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => handleCascadeConfirm(false)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : null}
                This {cascadeOptions.entityLabel} only
              </Button>
              <Button
                onClick={() => handleCascadeConfirm(true)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : null}
                Include all {cascadeOptions.childrenLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
