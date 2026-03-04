import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import { hashPassword, getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json() as { email?: string; password?: string; name?: string };
  const { email, password, name } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const existing = db()
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email);
  if (existing !== undefined) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    );
  }

  const id = uuid();
  const passwordHash = await hashPassword(password);

  db()
    .prepare(
      "INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)"
    )
    .run(id, email, passwordHash, name ?? null);

  const session = await getSession();
  session.userId = id;
  session.email = email;
  await session.save();

  return NextResponse.json({ id, email, name: name ?? null });
}
