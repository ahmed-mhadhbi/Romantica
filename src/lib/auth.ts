import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function currentUser() {
  const token = (await cookies()).get("romantica_session")?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token: hashToken(token) },
    include: { user: true },
  });
  return session && session.expiresAt > new Date() ? session.user : null;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      token: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  (await cookies()).set("romantica_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86400,
  });
}
export async function rateLimit(scope: string, limit = 20) {
  const h = await headers();
  const ip =
    process.env.TRUST_PROXY === "true"
      ? (h.get("x-forwarded-for")?.split(",")[0] ?? "unknown")
      : "local";
  const key = hashToken(`${scope}:${ip}:${Math.floor(Date.now() / 60000)}`);
  const record = await db.rateLimit.upsert({
    where: { key },
    create: { key, count: 1, expiresAt: new Date(Date.now() + 120000) },
    update: { count: { increment: 1 } },
  });
  if (record.count > limit)
    throw Error("Trop de tentatives. Réessayez dans une minute.");
}
