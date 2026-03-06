"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuggestionCard } from "@/components/suggestion-card";
import { DashboardGrid } from "@/components/dashboard-grid";
import { ShareDialog } from "@/components/share-dialog";
import { Separator } from "@/components/ui/separator";

interface Suggestion {
  type: string;
  x: string;
  y: string;
  groupBy?: string;
  title: string;
  reason: string;
}

export default function DashboardEditPage() {
  const params = useParams();
  const dashboardId = params.id as string;

  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);

  const loadDashboard = useCallback(async () => {
    const dash = await apiFetch(`/api/dashboards/${dashboardId}`);
    setDashboard(dash);
    setTitle(dash.title);
    setLoading(false);
  }, [dashboardId]);

  const loadSuggestions = useCallback(async () => {
    setSuggesting(true);
    try {
      const result = await apiFetch(`/api/dashboards/${dashboardId}/suggest`, {
        method: "POST",
        body: JSON.stringify({ num_suggestions: 5 }),
      });
      setSuggestions(result.suggestions || []);
    } catch (err) {
      console.error("Failed to load suggestions:", err);
    } finally {
      setSuggesting(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    loadDashboard().then(loadSuggestions);
  }, [loadDashboard, loadSuggestions]);

  async function handleAddChart(suggestion: Suggestion) {
    await apiFetch(`/api/dashboards/${dashboardId}/charts`, {
      method: "POST",
      body: JSON.stringify({
        chart_type: suggestion.type,
        title: suggestion.title,
        config: { x: suggestion.x, y: suggestion.y, groupBy: suggestion.groupBy },
      }),
    });
    await loadDashboard();
  }

  async function handleRemoveChart(chartId: string) {
    await apiFetch(`/api/dashboards/${dashboardId}/charts/${chartId}`, {
      method: "DELETE",
    });
    await loadDashboard();
  }

  async function handleSaveTitle() {
    await apiFetch(`/api/dashboards/${dashboardId}`, {
      method: "PUT",
      body: JSON.stringify({ title }),
    });
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!dashboard) return <p>Dashboard not found</p>;

  const source = dashboard.source as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSaveTitle}
          className="text-xl font-bold border-none shadow-none px-0 focus-visible:ring-0"
        />
        <ShareDialog dashboardId={dashboardId} />
      </div>

      <DashboardGrid
        charts={(dashboard.charts as Parameters<typeof DashboardGrid>[0]["charts"]) || []}
        parsedPath={(source?.parsed_path as string) || ""}
        onRemoveChart={handleRemoveChart}
      />

      <Separator />

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">AI Suggestions</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={loadSuggestions}
            disabled={suggesting}
          >
            {suggesting ? "Thinking..." : "Suggest More"}
          </Button>
        </div>

        {suggesting && suggestions.length === 0 ? (
          <p className="text-muted-foreground">
            AI is analyzing your data...
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestions.map((s, i) => (
              <SuggestionCard
                key={`${s.title}-${i}`}
                suggestion={s}
                onAdd={handleAddChart}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
