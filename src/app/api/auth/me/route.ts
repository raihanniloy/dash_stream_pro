import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
}

export async function GET() {
  const session = await getSession();
  if (session.userId === undefined) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = db()
    .prepare("SELECT id, email, name FROM users WHERE id = ?")
    .get(session.userId) as UserRow | undefined;

  if (user === undefined) {
    session.destroy();
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  return NextResponse.json(user);
}
