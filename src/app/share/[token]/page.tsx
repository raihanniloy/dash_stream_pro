"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ChartRenderer } from "@/components/chart-renderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SharedDashboardPage() {
  const params = useParams();
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [chartData, setChartData] = useState<Record<string, Record<string, unknown>[]>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/share/${params.token}`);
      if (!res.ok) {
        setError("Dashboard not found or link has expired.");
        return;
      }
      const data = await res.json();
      setDashboard(data);

      // Load chart data
      for (const chart of data.charts as Record<string, unknown>[]) {
        try {
          const qRes = await fetch("/api/data-query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              parsed_path: data.parsed_path,
              chart_config: { type: chart.chart_type, ...(chart.config as Record<string, unknown>) },
            }),
          });
          if (qRes.ok) {
            const qData = await qRes.json();
            setChartData((prev) => ({ ...prev, [chart.id as string]: qData.data }));
          }
        } catch {}
      }
    }
    load();
  }, [params.token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">{dashboard.title as string}</h1>
        {typeof dashboard.description === "string" && dashboard.description && (
          <p className="text-muted-foreground mb-6">{dashboard.description}</p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(dashboard.charts as Record<string, unknown>[]).map((chart) => (
            <Card key={chart.id as string}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">{chart.title as string}</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData[chart.id as string] ? (
                  <ChartRenderer
                    type={chart.chart_type as string}
                    data={chartData[chart.id as string] ?? []}
                    config={chart.config as { x: string; y: string; groupBy?: string }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Loading...
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-8">
          Built with DashStream
        </p>
      </div>
    </div>
  );
}
