"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ColumnStatsProps {
  profile: Record<
    string,
    {
      type: string;
      null_count: number;
      unique_count: number;
      min?: number | string;
      max?: number | string;
      mean?: number;
      top_values?: Record<string, number>;
    }
  >;
}

export function ColumnStats({ profile }: ColumnStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {Object.entries(profile).map(([col, info]) => (
        <Card key={col}>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center justify-between">
              {col}
              <Badge variant="outline" className="text-xs">
                {info.type}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 text-xs text-muted-foreground space-y-1">
            <p>Unique: {info.unique_count} | Nulls: {info.null_count}</p>
            {info.type === "numeric" && (
              <p>
                Range: {info.min} — {info.max} | Mean: {info.mean}
              </p>
            )}
            {info.type === "datetime" && (
              <p>
                {info.min} to {info.max}
              </p>
            )}
            {info.type === "categorical" && info.top_values && (
              <p>
                Top: {Object.keys(info.top_values).slice(0, 3).join(", ")}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
