import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const source = db()
    .prepare("SELECT * FROM data_sources WHERE id = ? AND user_id = ?")
    .get(id, session.userId) as Record<string, unknown> | undefined;

  if (!source) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...source,
    profile: JSON.parse((source.profile_json as string) || "null"),
  });
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

  const source = db()
    .prepare("SELECT * FROM data_sources WHERE id = ? AND user_id = ?")
    .get(id, session.userId) as Record<string, unknown> | undefined;

  if (!source) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const uploadDir = path.dirname(source.file_path as string);
  fs.rmSync(uploadDir, { recursive: true, force: true });

  db().prepare("DELETE FROM data_sources WHERE id = ?").run(id);

  return NextResponse.json({ ok: true });
}
