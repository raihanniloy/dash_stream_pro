"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

interface ShareDialogProps {
  dashboardId: string;
}

export function ShareDialog({ dashboardId }: ShareDialogProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    setLoading(true);
    try {
      const result = await apiFetch(`/api/dashboards/${dashboardId}/share`, {
        method: "POST",
      });
      setToken(result.token);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Dashboard</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!token ? (
            <Button onClick={handleShare} disabled={loading} className="w-full">
              {loading ? "Generating link..." : "Generate Share Link"}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input
                value={`${window.location.origin}/share/${token}`}
                readOnly
              />
              <Button onClick={handleCopy}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Anyone with this link can view the dashboard (read-only).
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
