import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, getSession } from "@/lib/auth";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { email?: string; password?: string };
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const user = db()
    .prepare("SELECT id, email, name, password_hash FROM users WHERE email = ?")
    .get(email) as UserRow | undefined;

  if (user === undefined || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  await session.save();

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
  });
}
