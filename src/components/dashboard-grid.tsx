"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartRenderer } from "@/components/chart-renderer";

interface ChartItem {
  id: string;
  chart_type: string;
  title: string;
  config: { x: string; y: string; groupBy?: string };
}

interface DashboardGridProps {
  charts: ChartItem[];
  parsedPath: string;
  onRemoveChart: (chartId: string) => void;
}

export function DashboardGrid({
  charts,
  parsedPath,
  onRemoveChart,
}: DashboardGridProps) {
  const [chartData, setChartData] = useState<Record<string, Record<string, unknown>[]>>({});

  useEffect(() => {
    charts.forEach(async (chart) => {
      if (chartData[chart.id]) return;
      try {
        const res = await fetch("/api/data-query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parsed_path: parsedPath,
            chart_config: { type: chart.chart_type, ...chart.config },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setChartData((prev) => ({ ...prev, [chart.id]: data.data }));
        }
      } catch (err) {
        console.error("Failed to load chart data:", err);
      }
    });
  }, [charts, parsedPath]);

  if (charts.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        No charts yet. Add charts from the suggestions below.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {charts.map((chart) => (
        <Card key={chart.id}>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-sm">{chart.title}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoveChart(chart.id)}
            >
              Remove
            </Button>
          </CardHeader>
          <CardContent>
            {chartData[chart.id] ? (
              <ChartRenderer
                type={chart.chart_type}
                data={chartData[chart.id] ?? []}
                config={chart.config}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Loading chart...
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
