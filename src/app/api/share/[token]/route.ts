import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const link = db()
    .prepare(
      "SELECT dashboard_id FROM share_links WHERE share_token = ? AND is_active = 1"
    )
    .get(token) as { dashboard_id: string } | undefined;

  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const dashboard = db()
    .prepare("SELECT * FROM dashboards WHERE id = ?")
    .get(link.dashboard_id) as Record<string, unknown> | undefined;

  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const charts = db()
    .prepare(
      "SELECT * FROM charts WHERE dashboard_id = ? ORDER BY position ASC"
    )
    .all(link.dashboard_id);

  const source = db()
    .prepare("SELECT parsed_path, profile_json FROM data_sources WHERE id = ?")
    .get(dashboard.data_source_id as string) as { parsed_path: string; profile_json: string } | undefined;

  return NextResponse.json({
    title: dashboard.title,
    description: dashboard.description,
    layout: JSON.parse((dashboard.layout_json as string) || "[]"),
    charts: (charts as Record<string, unknown>[]).map((c) => ({
      ...c,
      config: JSON.parse(c.config_json as string),
    })),
    parsed_path: source?.parsed_path,
  });
}
