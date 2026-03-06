import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { pythonFetch } from "@/lib/python-client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dashboardId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dashboard = db()
    .prepare("SELECT * FROM dashboards WHERE id = ? AND user_id = ?")
    .get(dashboardId, session.userId) as Record<string, unknown> | undefined;

  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const source = db()
    .prepare("SELECT profile_json FROM data_sources WHERE id = ?")
    .get(dashboard.data_source_id as string) as { profile_json: string } | undefined;

  if (!source?.profile_json) {
    return NextResponse.json({ error: "No profile data" }, { status: 400 });
  }

  const existingCharts = db()
    .prepare("SELECT config_json FROM charts WHERE dashboard_id = ?")
    .all(dashboardId)
    .map((c) => JSON.parse((c as Record<string, unknown>).config_json as string));

  const { num_suggestions } = await req.json().catch(() => ({ num_suggestions: 5 }));

  const result = await pythonFetch("/ai/suggest-charts", {
    profile_json: JSON.parse(source.profile_json),
    num_suggestions,
    existing_charts: existingCharts.length > 0 ? existingCharts : null,
  });

  return NextResponse.json(result);
}
