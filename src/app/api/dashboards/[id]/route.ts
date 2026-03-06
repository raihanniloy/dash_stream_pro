import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dashboard = db()
    .prepare("SELECT * FROM dashboards WHERE id = ? AND user_id = ?")
    .get(id, session.userId) as Record<string, unknown> | undefined;

  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const charts = db()
    .prepare(
      "SELECT * FROM charts WHERE dashboard_id = ? ORDER BY position ASC"
    )
    .all(id);

  const source = db()
    .prepare("SELECT * FROM data_sources WHERE id = ?")
    .get(dashboard.data_source_id as string) as Record<string, unknown> | undefined;

  return NextResponse.json({
    ...dashboard,
    layout: JSON.parse((dashboard.layout_json as string) || "[]"),
    charts: (charts as Record<string, unknown>[]).map((c) => ({
      ...c,
      config: JSON.parse(c.config_json as string),
    })),
    source: source
      ? { ...source, profile: JSON.parse((source.profile_json as string) || "null") }
      : null,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dashboard = db()
    .prepare("SELECT id FROM dashboards WHERE id = ? AND user_id = ?")
    .get(id, session.userId);

  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { title, description, layout } = await req.json();

  const updates: string[] = [];
  const values: unknown[] = [];

  if (title !== undefined) {
    updates.push("title = ?");
    values.push(title);
  }
  if (description !== undefined) {
    updates.push("description = ?");
    values.push(description);
  }
  if (layout !== undefined) {
    updates.push("layout_json = ?");
    values.push(JSON.stringify(layout));
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  db()
    .prepare(`UPDATE dashboards SET ${updates.join(", ")} WHERE id = ?`)
    .run(...values);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dashboard = db()
    .prepare("SELECT id FROM dashboards WHERE id = ? AND user_id = ?")
    .get(id, session.userId);

  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  db().prepare("DELETE FROM dashboards WHERE id = ?").run(id);

  return NextResponse.json({ ok: true });
}
