'use client';

/**
 * Quality Breakdown section — donut chart showing file quality distribution
 * Visible to all users
 */

import { Pie, PieChart, Cell, Label } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { ShieldCheck } from 'lucide-react';

interface QualityGroup {
  quality: string;
  count: number;
}

interface QualityBreakdownProps {
  qualityData: QualityGroup[];
  totalFiles: number;
}

const QUALITY_COLORS: Record<string, string> = {
  OK: 'hsl(var(--success))',
  VERIFIED: 'hsl(var(--success))',
  UNVERIFIED: 'hsl(var(--warning))',
  BROKEN: 'hsl(var(--destructive))',
};

const QUALITY_LABELS: Record<string, string> = {
  OK: 'OK',
  VERIFIED: 'Verified',
  UNVERIFIED: 'Unverified',
  BROKEN: 'Broken',
};

export function QualityBreakdown({ qualityData, totalFiles }: QualityBreakdownProps) {
  // Combine OK + VERIFIED into one "Verified" slice for clarity
  const verifiedCount = qualityData
    .filter((g) => g.quality === 'OK' || g.quality === 'VERIFIED')
    .reduce((sum, g) => sum + g.count, 0);
  const unverifiedCount = qualityData
    .find((g) => g.quality === 'UNVERIFIED')?.count || 0;
  const brokenCount = qualityData
    .find((g) => g.quality === 'BROKEN')?.count || 0;

  const chartData = [
    { name: 'verified', label: 'Verified / OK', value: verifiedCount, fill: QUALITY_COLORS.VERIFIED },
    { name: 'unverified', label: 'Unverified', value: unverifiedCount, fill: QUALITY_COLORS.UNVERIFIED },
    { name: 'broken', label: 'Broken', value: brokenCount, fill: QUALITY_COLORS.BROKEN },
  ].filter((d) => d.value > 0);

  const chartConfig: ChartConfig = {
    verified: { label: 'Verified / OK', color: QUALITY_COLORS.VERIFIED },
    unverified: { label: 'Unverified', color: QUALITY_COLORS.UNVERIFIED },
    broken: { label: 'Broken', color: QUALITY_COLORS.BROKEN },
  };

  if (totalFiles === 0) {
    return (
      <Card className="mb-6 md:mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            Quality Overview
          </CardTitle>
          <CardDescription>File quality distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">
            Scan your library to see quality metrics
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 md:mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5" />
          Quality Overview
        </CardTitle>
        <CardDescription>File quality distribution across {totalFiles} files</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-[1fr_1fr] items-center">
          {/* Donut chart */}
          <ChartContainer config={chartConfig} className="mx-auto aspect-square w-full max-h-[220px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                innerRadius={60}
                outerRadius={90}
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                            {totalFiles}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20} className="fill-muted-foreground text-xs">
                            files
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>

          {/* Legend with counts */}
          <div className="space-y-3">
            {chartData.map((item) => {
              const pct = totalFiles > 0 ? Math.round((item.value / totalFiles) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <div
                    className="size-3 rounded-sm shrink-0"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-sm flex-1">{item.label}</span>
                  <span className="text-sm font-medium tabular-nums">{item.value}</span>
                  <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
