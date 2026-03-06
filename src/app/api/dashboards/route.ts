import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dashboards = db()
    .prepare(
      `SELECT d.*, ds.filename as source_filename
       FROM dashboards d
       JOIN data_sources ds ON d.data_source_id = ds.id
       WHERE d.user_id = ?
       ORDER BY d.updated_at DESC`
    )
    .all(session.userId);

  return NextResponse.json(dashboards);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data_source_id, title } = await req.json();

  if (!data_source_id) {
    return NextResponse.json(
      { error: "data_source_id is required" },
      { status: 400 }
    );
  }

  const source = db()
    .prepare("SELECT id FROM data_sources WHERE id = ? AND user_id = ?")
    .get(data_source_id, session.userId);

  if (!source) {
    return NextResponse.json(
      { error: "Data source not found" },
      { status: 404 }
    );
  }

  const id = uuid();
  db()
    .prepare(
      "INSERT INTO dashboards (id, user_id, data_source_id, title) VALUES (?, ?, ?, ?)"
    )
    .run(id, session.userId, data_source_id, title || "Untitled Dashboard");

  return NextResponse.json({ id, data_source_id, title: title || "Untitled Dashboard" });
}
