'use client';

/**
 * Actions Needed section — horizontal bar chart of files needing action
 * Admin only
 */

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Wrench, CheckCircle2 } from 'lucide-react';
import { ACTION_LABELS } from '@/lib/status';
import type { Action } from '@/generated/prisma/client';

interface ActionGroup {
  action: string;
  count: number;
}

interface ActionsNeededProps {
  actionData: ActionGroup[];
}

const ACTION_COLORS: Record<string, string> = {
  REDOWNLOAD: 'hsl(var(--chart-1))',
  CONVERT: 'hsl(var(--chart-2))',
  ORGANIZE: 'hsl(var(--chart-3))',
  REPAIR: 'hsl(var(--destructive))',
};

export function ActionsNeeded({ actionData }: ActionsNeededProps) {
  const totalActions = actionData.reduce((sum, g) => sum + g.count, 0);

  if (totalActions === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="size-5" />
            Actions Needed
          </CardTitle>
          <CardDescription>Files requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 py-6 justify-center text-sm text-success-foreground">
            <CheckCircle2 className="size-4" />
            All files are clean — no actions needed
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = actionData
    .sort((a, b) => b.count - a.count)
    .map((g) => ({
      action: ACTION_LABELS[g.action as Action] || g.action,
      count: g.count,
      fill: ACTION_COLORS[g.action] || 'hsl(var(--chart-4))',
    }));

  const chartConfig: ChartConfig = Object.fromEntries(
    chartData.map((d) => [d.action, { label: d.action, color: d.fill }])
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="size-5" />
          Actions Needed
        </CardTitle>
        <CardDescription>{totalActions} files require attention</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16 }}>
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="action"
              type="category"
              tickLine={false}
              axisLine={false}
              width={80}
              tick={{ fontSize: 12 }}
            />
            <XAxis type="number" hide />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

