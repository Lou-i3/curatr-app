'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlatformSettings } from './platform-settings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { DATE_FORMAT_OPTIONS, type DateFormat, type AppSettings } from '@/lib/settings-shared';

interface SettingsFormProps {
  initialSettings: AppSettings;
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const router = useRouter();
  const [dateFormat, setDateFormat] = useState<DateFormat>(initialSettings.dateFormat);
  const [maxParallelTasks, setMaxParallelTasks] = useState(initialSettings.maxParallelTasks);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const hasChanges =
    dateFormat !== initialSettings.dateFormat ||
    maxParallelTasks !== initialSettings.maxParallelTasks;

  const handleSave = async () => {
    setIsSaving(true);
    setSavedMessage('');

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateFormat, maxParallelTasks }),
      });

      if (response.ok) {
        setSavedMessage('Settings saved successfully');
        router.refresh();
        setTimeout(() => setSavedMessage(''), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Display</CardTitle>
          <CardDescription>Configure how information is displayed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <label htmlFor="date-format" className="text-sm font-medium">
              Date Format
            </label>
            <Select value={dateFormat} onValueChange={(v) => setDateFormat(v as DateFormat)}>
              <SelectTrigger id="date-format" className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMAT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span>{option.label}</span>
                    <span className="ml-2 text-muted-foreground">({option.example})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose how dates are displayed throughout the application
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Background Tasks</CardTitle>
          <CardDescription>Configure task execution behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <label htmlFor="max-tasks" className="text-sm font-medium">
                Max Parallel Tasks
              </label>
              <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                {maxParallelTasks}
              </span>
            </div>
            <Slider
              id="max-tasks"
              min={1}
              max={10}
              step={1}
              value={[maxParallelTasks]}
              onValueChange={([value]) => setMaxParallelTasks(value)}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Maximum number of background tasks that can run simultaneously.
              Higher values process faster but use more resources.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Playback Testing</CardTitle>
          <CardDescription>
            Configure platforms for testing file playback compatibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlatformSettings />
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
        {savedMessage && (
          <p className="text-sm text-success-foreground">{savedMessage}</p>
        )}
      </div>
    </div>
  );
}
