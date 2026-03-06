"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Suggestion {
  type: string;
  x: string;
  y: string;
  groupBy?: string;
  title: string;
  reason: string;
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  onAdd: (suggestion: Suggestion) => void;
}

export function SuggestionCard({ suggestion, onAdd }: SuggestionCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm">{suggestion.title}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {suggestion.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
        <p className="text-xs">
          X: <strong>{suggestion.x}</strong> | Y: <strong>{suggestion.y}</strong>
          {suggestion.groupBy && (
            <> | Group: <strong>{suggestion.groupBy}</strong></>
          )}
        </p>
        <Button size="sm" className="w-full" onClick={() => onAdd(suggestion)}>
          Add to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}
