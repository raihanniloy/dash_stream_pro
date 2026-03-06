"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { DataTablePreview } from "@/components/data-table-preview";
import { ColumnStats } from "@/components/column-stats";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PreviewPage() {
  const params = useParams();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const dash = await apiFetch(`/api/dashboards/${params.id}`);
      setDashboard(dash);

      const source = dash.source as Record<string, unknown> | null;
      if (source?.parsed_path) {
        const columns = Object.keys(
          (source.profile as Record<string, unknown>)?.columns as Record<string, unknown> || {}
        );
        if (columns.length > 0) {
          const res = await fetch("/api/data-query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              parsed_path: source.parsed_path,
              chart_config: {
                type: "bar",
                x: columns[0],
                y: columns[1] || columns[0],
              },
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setPreviewData(data.data || []);
          }
        }
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) return <p className="text-muted-foreground">Loading preview...</p>;
  if (!dashboard) return <p>Dashboard not found</p>;

  const source = dashboard.source as Record<string, unknown> | null;
  const profile = (source?.profile as Record<string, unknown>)?.columns as Record<string, { type: string }> || {};
  const columns = Object.keys(profile);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{source?.filename as string}</h1>
          <p className="text-sm text-muted-foreground">
            {source?.row_count as number} rows, {source?.column_count as number} columns
          </p>
        </div>
        <Button onClick={() => router.push(`/dashboards/${params.id}/edit`)}>
          Continue to Dashboard
        </Button>
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Table Preview</TabsTrigger>
          <TabsTrigger value="stats">Column Stats</TabsTrigger>
        </TabsList>
        <TabsContent value="table">
          <DataTablePreview
            columns={columns}
            profile={profile}
            data={previewData}
          />
        </TabsContent>
        <TabsContent value="stats">
          <ColumnStats profile={profile as Parameters<typeof ColumnStats>[0]["profile"]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
