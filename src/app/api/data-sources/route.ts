import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sources = db()
    .prepare(
      "SELECT id, filename, file_type, file_size, row_count, column_count, created_at FROM data_sources WHERE user_id = ? ORDER BY created_at DESC"
    )
    .all(session.userId);

  return NextResponse.json(sources);
}
