'use client';

/**
 * File Intelligence section — codec/resolution/HDR breakdown
 * Admin only. Mix of horizontal bar charts and donut chart.
 */

import { Bar, BarChart, XAxis, YAxis, Pie, PieChart, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Progress } from '@/components/ui/progress';
import { FileVideo } from 'lucide-react';

interface GroupData {
  name: string;
  count: number;
}

interface FileIntelligenceProps {
  codecs: GroupData[];
  resolutions: GroupData[];
  hdr: GroupData[];
  analyzedCount: number;
  totalFiles: number;
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--muted-foreground))',
];

function HorizontalBarCard({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: GroupData[];
}) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.slice(0, 8).map((d, i) => ({
    name: d.name || 'Unknown',
    count: d.count,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const chartConfig: ChartConfig = Object.fromEntries(
    chartData.map((d) => [d.name, { label: d.name, color: d.fill }])
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16 }}>
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              width={70}
              tick={{ fontSize: 11 }}
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

function HdrDonutCard({ data, totalFiles }: { data: GroupData[]; totalFiles: number }) {
  // Files without HDR = SDR
  const hdrTotal = data.reduce((sum, d) => sum + d.count, 0);
  const sdrCount = totalFiles - hdrTotal;

  const chartData = [
    { name: 'SDR', value: sdrCount > 0 ? sdrCount : 0, fill: 'hsl(var(--muted-foreground))' },
    ...data.map((d, i) => ({
      name: d.name || 'Unknown',
      value: d.count,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    })),
  ].filter((d) => d.value > 0);

  const chartConfig: ChartConfig = Object.fromEntries(
    chartData.map((d) => [d.name, { label: d.name, color: d.fill }])
  );

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">HDR Formats</CardTitle>
          <CardDescription>HDR type distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">HDR Formats</CardTitle>
        <CardDescription>HDR type distribution</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto aspect-square w-full max-h-[180px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={45}
              outerRadius={70}
              strokeWidth={2}
              stroke="hsl(var(--background))"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-2 space-y-1">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center gap-2 text-xs">
              <div className="size-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.fill }} />
              <span className="flex-1 text-muted-foreground">{item.name}</span>
              <span className="tabular-nums font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function FileIntelligence({ codecs, resolutions, hdr, analyzedCount, totalFiles }: FileIntelligenceProps) {
  const analysisPct = totalFiles > 0 ? Math.round((analyzedCount / totalFiles) * 100) : 0;

  return (
    <div className="space-y-4 mb-6 md:mb-8">
      {/* Section header with analysis progress */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
          <FileVideo className="size-5" />
          File Intelligence
        </h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{analyzedCount} of {totalFiles} analyzed</span>
          <Progress value={analysisPct} className="w-24 h-2" />
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
        <HorizontalBarCard
          title="Video Codecs"
          description="Top codecs by frequency"
          data={codecs}
        />
        <HorizontalBarCard
          title="Resolutions"
          description="Top resolutions by frequency"
          data={resolutions}
        />
        <HdrDonutCard data={hdr} totalFiles={totalFiles} />
      </div>
    </div>
  );
}
