import crypto from "crypto";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

const SESSION_SECRET =
  process.env.SESSION_SECRET ??
  "change-me-to-a-random-string-at-least-32-chars!!";

export interface SessionData {
  userId?: string;
  email?: string;
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, {
    password: SESSION_SECRET,
    cookieName: "dashstream_session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  });
}

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err !== null) {
        reject(err);
        return;
      }
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const colonIndex = hash.indexOf(":");
    if (colonIndex === -1) {
      resolve(false);
      return;
    }
    const salt = hash.slice(0, colonIndex);
    const key = hash.slice(colonIndex + 1);
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err !== null) {
        reject(err);
        return;
      }
      resolve(crypto.timingSafeEqual(derivedKey, Buffer.from(key, "hex")));
    });
  });
}
