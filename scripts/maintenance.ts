import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
try {
  const [sessions, rateLimits] = await db.$transaction([
    db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
  ]);
  console.log(
    `Deleted ${sessions.count} expired sessions and ${rateLimits.count} expired rate-limit buckets.`,
  );
} finally {
  await db.$disconnect();
}
