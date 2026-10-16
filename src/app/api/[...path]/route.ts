import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { Prisma, Role, OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { currentUser, createSession, rateLimit, hashToken } from "@/lib/auth";
import { catalog } from "@/lib/catalog";
import { placeOrder, moveOrder, serial } from "@/lib/orders";
import type { Bundle } from "@/lib/menu";
export const runtime = "nodejs";
async function readJson(req: NextRequest) {
  const reader = req.body?.getReader();
  if (!reader) throw Error("Corps de demande manquant.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 30000) {
      await reader.cancel();
      throw Error("Demande trop volumineuse.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Error("JSON invalide.");
  }
}
const safeUser = (u: NonNullable<Awaited<ReturnType<typeof currentUser>>>) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  verified: u.verified,
  studentUntil: u.studentUntil,
  points: u.points,
  reservedPoints: u.reservedPoints,
  marketingConsent: u.marketingConsent,
});
async function handler(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const path = (await context.params).path.join("/");
    const method = req.method;
    if (method !== "GET") {
      const origin = req.headers.get("origin");
      const allowed = new URL(process.env.APP_URL ?? req.url).origin;
      if (origin !== allowed)
        return NextResponse.json(
          { error: "Origine refusée." },
          { status: 403 },
        );
      if (Number(req.headers.get("content-length") ?? 0) > 30000)
        throw Error("Demande trop volumineuse.");
    }
    if (path === "catalog" && method === "GET")
      return NextResponse.json(await catalog());
    if (path === "auth" && method === "POST") {
      await rateLimit("auth", 12);
      const body = z
        .object({
          action: z.enum(["login", "register"]),
          email: z
            .string()
            .email()
            .max(180)
            .transform((x) => x.toLowerCase()),
          password: z.string().min(12).max(100),
          name: z.string().trim().min(2).max(80).optional(),
          marketingConsent: z.boolean().default(false),
        })
        .parse(await readJson(req));
      let user = await db.user.findUnique({ where: { email: body.email } });
      if (body.action === "register") {
        if (!body.name) throw Error("Indiquez votre nom.");
        if (user) throw Error("Ce compte existe déjà. Connectez-vous.");
        user = await db.user.create({
          data: {
            email: body.email,
            password: await hash(body.password, 12),
            name: body.name,
            marketingConsent: body.marketingConsent,
          },
        });
      } else if (!user || !(await compare(body.password, user.password)))
        throw Error("Identifiants incorrects.");
      await createSession(user!.id);
      return NextResponse.json({ user: safeUser(user!) });
    }
    if (path === "logout" && method === "POST") {
      const token = (await cookies()).get("romantica_session")?.value;
      if (token)
        await db.session.deleteMany({ where: { token: hashToken(token) } });
      (await cookies()).delete("romantica_session");
      return NextResponse.json({ ok: true });
    }
    const user = await currentUser();
    if (path === "me" && method === "GET") {
      if (!user) return NextResponse.json({ user: null });
      const [orders, ledger] = await Promise.all([
        db.order.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            status: true,
            total: true,
            createdAt: true,
            lines: true,
            mode: true,
            eligiblePoints: true,
          },
        }),
        db.ledger.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      ]);
      return NextResponse.json({ user: safeUser(user), orders, ledger });
    }
    if (path === "me" && method === "PATCH") {
      if (!user) throw Error("Connectez-vous.");
      const data = z
        .object({ marketingConsent: z.boolean() })
        .parse(await readJson(req));
      await db.user.update({ where: { id: user.id }, data });
      return NextResponse.json({ ok: true });
    }
    if (path === "orders" && method === "POST") {
      await rateLimit(`orders:${user?.id ?? "guest"}`, 10);
      const order = await placeOrder(await readJson(req), user?.id ?? null);
      return NextResponse.json(
        { order: { id: order.id, status: order.status, total: order.total } },
        { status: 201 },
      );
    }
    if (path === "feedback" && method === "POST") {
      await rateLimit("feedback", 5);
      const data = z
        .object({ message: z.string().trim().min(5).max(1000) })
        .parse(await readJson(req));
      await db.feedback.create({ data: { ...data, userId: user?.id } });
      return NextResponse.json({ ok: true });
    }
    if (!user || user.role === "CUSTOMER")
      return NextResponse.json(
        { error: "Accès réservé au personnel." },
        { status: 403 },
      );
    if (path === "staff" && method === "GET") {
      const orders = await db.order.findMany({
        where: {
          status: { in: ["REQUESTED", "ACCEPTED", "PREPARING", "READY"] },
        },
        orderBy: { createdAt: "asc" },
        take: 200,
      });
      if (user.role === "KITCHEN")
        return NextResponse.json({
          user: safeUser(user),
          orders: orders.map((o) => ({
            ...o,
            phone: undefined,
            receipt: undefined,
          })),
        });
      const users = await db.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          verified: true,
          points: true,
          studentUntil: true,
        },
        take: 200,
        orderBy: { createdAt: "desc" },
      });
      if (user.role !== "OWNER")
        return NextResponse.json({ user: safeUser(user), orders, users });
      const [allOrders, feedback, campaigns, audit, cat] = await Promise.all([
        db.order.findMany({ orderBy: { createdAt: "desc" }, take: 2000 }),
        db.feedback.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
        db.campaign.findMany(),
        db.audit.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
        catalog(true),
      ]);
      return NextResponse.json({
        user: safeUser(user),
        orders,
        users,
        allOrders,
        feedback,
        campaigns,
        audit,
        ...cat,
      });
    }
    if (path === "staff/order" && method === "PATCH") {
      const body = z
        .object({
          id: z.string(),
          status: z.nativeEnum(OrderStatus),
          receipt: z.string().max(100).optional(),
        })
        .parse(await readJson(req));
      return NextResponse.json({
        order: await moveOrder(user, body.id, body.status, body.receipt),
      });
    }
    if (
      path === "staff/customer" &&
      method === "PATCH" &&
      ["OWNER", "CASHIER"].includes(user.role)
    ) {
      const body = z
        .object({
          id: z.string(),
          verified: z.boolean().optional(),
          studentUntil: z.string().datetime().nullable().optional(),
          reason: z.string().min(5).max(300),
        })
        .parse(await readJson(req));
      if (body.studentUntil && new Date(body.studentUntil) < new Date())
        throw Error("La validité doit être future.");
      await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: body.id },
          data: {
            verified: body.verified,
            studentUntil:
              body.studentUntil === undefined
                ? undefined
                : body.studentUntil
                  ? new Date(body.studentUntil)
                  : null,
          },
        });
        await tx.audit.create({
          data: {
            actorId: user.id,
            action: "CUSTOMER_VERIFIED",
            target: body.id,
            details: body,
          },
        });
      });
      return NextResponse.json({ ok: true });
    }
    if (user.role !== "OWNER")
      return NextResponse.json(
        { error: "Accès propriétaire requis." },
        { status: 403 },
      );
    const audit = (
      tx: Prisma.TransactionClient,
      action: string,
      target: string,
      details: Prisma.InputJsonValue,
    ) =>
      tx.audit.create({ data: { actorId: user.id, action, target, details } });
    if (path === "owner/product" && method === "PATCH") {
      const body = z
        .object({
          id: z.string(),
          name: z.string().min(2).max(120),
          description: z.string().max(500),
          price: z.number().int().min(500).max(500000),
          cost: z.number().int().min(0).max(500000).nullable(),
          available: z.boolean(),
          studentEligible: z.boolean(),
          loyaltyEligible: z.boolean(),
          rewardEligible: z.boolean(),
          image: z
            .string()
            .refine(
              (s) =>
                s === "" ||
                s.startsWith("/images/") ||
                s.startsWith("https://"),
              "URL photo invalide",
            )
            .nullable(),
          overrideReason: z.string().max(300).optional(),
        })
        .parse(await readJson(req));
      await serial(async (tx) => {
        const settings = await tx.settings.findUniqueOrThrow({
          where: { id: "main" },
        });
        const old = await tx.product.findUniqueOrThrow({
          where: { id: body.id },
        });
        const activeBundle = await tx.combo.findMany({
          where: { active: true },
        });
        if (
          activeBundle.some((b) =>
            (b.items as unknown as Bundle["items"]).some(
              (i) => i.productId === body.id,
            ),
          ) &&
          (body.price !== old.price || body.cost !== old.cost)
        )
          throw Error(
            "Désactivez les formules contenant cet article avant de modifier prix ou coût.",
          );
        const sale =
          body.studentEligible && settings.studentActive
            ? Math.round((body.price * (100 - settings.studentPercent)) / 100)
            : body.price;
        const rewardRisk =
          body.rewardEligible &&
          (body.cost === null ||
            body.price - body.cost * 2 <
              (body.price * settings.minMarginPercent) / 100);
        if (
          (body.cost === null ||
            sale - body.cost < (sale * settings.minMarginPercent) / 100 ||
            rewardRisk) &&
          !body.overrideReason?.trim()
        )
          throw Error(
            "Coût inconnu ou marge sous le seuil (cadeau inclus) : saisissez un motif de dérogation.",
          );
        const { id, overrideReason, ...data } = body;
        await tx.product.update({ where: { id }, data });
        await audit(
          tx,
          "PRODUCT_UPDATED",
          id,
          JSON.parse(
            JSON.stringify({
              before: old,
              after: data,
              overrideReason: overrideReason ?? null,
            }),
          ),
        );
      });
      return NextResponse.json({ ok: true });
    }
    if (path === "owner/settings" && method === "PATCH") {
      const body = z
        .object({
          studentActive: z.boolean(),
          studentPercent: z.number().int().min(1).max(50),
          studentStartsAt: z.string().datetime().nullable(),
          studentEndsAt: z.string().datetime().nullable(),
          comboPoints: z.boolean(),
          minMarginPercent: z.number().int().min(0).max(90),
          orderingEnabled: z.boolean(),
          openingHours: z.string().min(5).max(500),
          whatsapp: z.string().regex(/^[0-9]{0,15}$/),
          address: z.string().min(3).max(250),
          mapsUrl: z.string().url().startsWith("https://"),
          overrideReason: z.string().max(300).optional(),
        })
        .parse(await readJson(req));
      if (
        body.studentStartsAt &&
        body.studentEndsAt &&
        body.studentStartsAt >= body.studentEndsAt
      )
        throw Error("La fin doit suivre le début.");
      await serial(async (tx) => {
        if (body.studentActive) {
          const products = await tx.product.findMany({
            where: { studentEligible: true },
          });
          if (
            products.some(
              (p) =>
                p.cost === null ||
                Math.round((p.price * (100 - body.studentPercent)) / 100) -
                  (p.cost ?? 0) <
                  (Math.round((p.price * (100 - body.studentPercent)) / 100) *
                    body.minMarginPercent) /
                    100,
            ) &&
            !body.overrideReason?.trim()
          )
            throw Error(
              "Coûts inconnus ou marge insuffisante : motif de dérogation requis.",
            );
        }
        const { overrideReason, ...data } = body;
        await tx.settings.update({
          where: { id: "main" },
          data: {
            ...data,
            studentStartsAt: body.studentStartsAt
              ? new Date(body.studentStartsAt)
              : null,
            studentEndsAt: body.studentEndsAt
              ? new Date(body.studentEndsAt)
              : null,
          },
        });
        await audit(tx, "SETTINGS_UPDATED", "main", {
          ...body,
          overrideReason: overrideReason ?? null,
        });
      });
      return NextResponse.json({ ok: true });
    }
    if (path === "owner/combo" && method === "PATCH") {
      const body = z
        .object({
          id: z.string(),
          name: z.string().min(2).max(80),
          price: z.number().int().positive().max(500000),
          active: z.boolean(),
          items: z
            .array(
              z.object({
                productId: z.string(),
                quantity: z.number().int().min(1).max(10),
              }),
            )
            .min(1)
            .max(15),
          overrideReason: z.string().max(300).optional(),
        })
        .parse(await readJson(req));
      await serial(async (tx) => {
        const products = await tx.product.findMany();
        const settings = await tx.settings.findUniqueOrThrow({
          where: { id: "main" },
        });
        let normal = 0,
          cost = 0,
          unknown = false;
        for (const item of body.items) {
          const p = products.find((x) => x.id === item.productId);
          if (!p) throw Error("Article inconnu.");
          if (body.active && !p.available)
            throw Error("Article indisponible dans la formule.");
          normal += p.price * item.quantity;
          cost += (p.cost ?? 0) * item.quantity;
          unknown ||= p.cost === null;
        }
        if (body.price >= normal)
          throw Error("La formule doit offrir une économie réelle.");
        if (
          body.active &&
          (unknown ||
            body.price - cost <
              (body.price * settings.minMarginPercent) / 100) &&
          !body.overrideReason?.trim()
        )
          throw Error(
            "Coûts inconnus ou marge insuffisante : motif de dérogation requis.",
          );
        const { id, overrideReason, ...data } = body;
        await tx.combo.update({ where: { id }, data });
        await audit(tx, "COMBO_UPDATED", id, {
          ...body,
          overrideReason: overrideReason ?? null,
        });
      });
      return NextResponse.json({ ok: true });
    }
    if (path === "owner/staff" && method === "PATCH") {
      const body = z
        .object({ id: z.string(), role: z.nativeEnum(Role) })
        .parse(await readJson(req));
      if (body.id === user.id)
        throw Error("Vous ne pouvez pas modifier votre propre rôle.");
      await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: body.id },
          data: { role: body.role },
        });
        await tx.session.deleteMany({ where: { userId: body.id } });
        await audit(tx, "ROLE_UPDATED", body.id, body);
      });
      return NextResponse.json({ ok: true });
    }
    if (path === "owner/points" && method === "POST") {
      const body = z
        .object({
          id: z.string(),
          delta: z.number().int().min(-100).max(100),
          reason: z.string().min(10).max(300),
          requestId: z.string().uuid(),
        })
        .parse(await readJson(req));
      await serial(async (tx) => {
        const duplicate = await tx.audit.findFirst({
          where: { action: "POINTS_ADJUSTED", target: body.requestId },
        });
        if (duplicate) return;
        const target = await tx.user.findUniqueOrThrow({
          where: { id: body.id },
        });
        if (target.points + body.delta < target.reservedPoints)
          throw Error("Des points sont réservés pour un cadeau.");
        await tx.user.update({
          where: { id: body.id },
          data: { points: { increment: body.delta } },
        });
        await tx.ledger.create({
          data: {
            userId: body.id,
            kind: "MANUAL",
            delta: body.delta,
            reason: body.reason,
          },
        });
        await audit(tx, "POINTS_ADJUSTED", body.requestId, body);
      });
      return NextResponse.json({ ok: true });
    }
    if (path === "owner/campaign" && method === "PATCH") {
      const body = z
        .object({
          id: z.string().regex(/^[a-z0-9-]{2,40}$/),
          name: z.string().min(2).max(80),
          active: z.boolean(),
          spend: z.number().int().nonnegative().nullable(),
        })
        .parse(await readJson(req));
      await db.$transaction(async (tx) => {
        await tx.campaign.upsert({
          where: { id: body.id },
          create: body,
          update: body,
        });
        await audit(tx, "CAMPAIGN_UPDATED", body.id, body);
      });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Action inconnue." }, { status: 404 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues.map((i) => i.message).join(" · ") },
        { status: 400 },
      );
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        {
          error:
            error.code === "P2002"
              ? "Référence déjà utilisée. Vérifiez le reçu ou le compte."
              : "Conflit de données. Actualisez et réessayez.",
        },
        { status: 409 },
      );
    }
    if (error instanceof Prisma.PrismaClientInitializationError)
      return NextResponse.json(
        { error: "Service indisponible. Veuillez réessayer plus tard." },
        { status: 503 },
      );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur de service." },
      { status: 400 },
    );
  }
}
export { handler as GET, handler as POST, handler as PATCH };
