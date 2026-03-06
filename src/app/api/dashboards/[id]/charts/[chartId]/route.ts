import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chartId: string }> }
) {
  const { id: dashboardId, chartId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dashboard = db()
    .prepare("SELECT id FROM dashboards WHERE id = ? AND user_id = ?")
    .get(dashboardId, session.userId);

  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { chart_type, title, config, position } = await req.json();

  const updates: string[] = [];
  const values: unknown[] = [];

  if (chart_type !== undefined) { updates.push("chart_type = ?"); values.push(chart_type); }
  if (title !== undefined) { updates.push("title = ?"); values.push(title); }
  if (config !== undefined) { updates.push("config_json = ?"); values.push(JSON.stringify(config)); }
  if (position !== undefined) { updates.push("position = ?"); values.push(position); }

  values.push(chartId, dashboardId);

  db()
    .prepare(`UPDATE charts SET ${updates.join(", ")} WHERE id = ? AND dashboard_id = ?`)
    .run(...values);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; chartId: string }> }
) {
  const { id: dashboardId, chartId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dashboard = db()
    .prepare("SELECT id FROM dashboards WHERE id = ? AND user_id = ?")
    .get(dashboardId, session.userId);

  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  db()
    .prepare("DELETE FROM charts WHERE id = ? AND dashboard_id = ?")
    .run(chartId, dashboardId);

  return NextResponse.json({ ok: true });
}
