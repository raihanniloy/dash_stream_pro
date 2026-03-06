import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

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
    .prepare("SELECT id FROM dashboards WHERE id = ? AND user_id = ?")
    .get(dashboardId, session.userId);

  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }

  const { chart_type, title, config } = await req.json();

  if (!chart_type || !config) {
    return NextResponse.json(
      { error: "chart_type and config are required" },
      { status: 400 }
    );
  }

  const maxPos = db()
    .prepare(
      "SELECT MAX(position) as max_pos FROM charts WHERE dashboard_id = ?"
    )
    .get(dashboardId) as { max_pos: number | null };

  const chartId = uuid();
  const position = (maxPos?.max_pos ?? -1) + 1;

  db()
    .prepare(
      "INSERT INTO charts (id, dashboard_id, chart_type, title, config_json, position) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(chartId, dashboardId, chart_type, title || null, JSON.stringify(config), position);

  return NextResponse.json({ id: chartId, chart_type, title, config, position });
}
