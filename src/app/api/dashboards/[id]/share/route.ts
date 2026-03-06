import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import crypto from "crypto";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _req: NextRequest,
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = db()
    .prepare(
      "SELECT share_token FROM share_links WHERE dashboard_id = ? AND is_active = 1"
    )
    .get(dashboardId) as { share_token: string } | undefined;

  if (existing) {
    return NextResponse.json({ token: existing.share_token });
  }

  const token = crypto.randomBytes(6).toString("base64url");
  db()
    .prepare(
      "INSERT INTO share_links (id, dashboard_id, share_token) VALUES (?, ?, ?)"
    )
    .run(uuid(), dashboardId, token);

  return NextResponse.json({ token });
}
