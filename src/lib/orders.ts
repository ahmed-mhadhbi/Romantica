import { Prisma, Role, OrderStatus } from "@prisma/client";
import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { cartSchema, priceCart, canTransition } from "./pricing";
import type { Bundle, MenuProduct } from "./menu";
export const orderSchema = cartSchema.extend({
  idempotencyKey: z.string().uuid(),
  customerName: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^\+?[0-9\s]{8,16}$/),
  pickupAt: z.string().datetime().nullable().optional(),
  note: z.string().max(500).default(""),
  campaignId: z.string().max(80).optional(),
});
type Tx = Prisma.TransactionClient;
export async function serial<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  for (let i = 0; i < 5; i++) {
    try {
      return await db.$transaction(fn, {
        isolationLevel: "Serializable",
        timeout: 15000,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        i < 4
      )
        continue;
      throw error;
    }
  }
  throw Error("Veuillez réessayer.");
}
export async function placeOrder(raw: unknown, userId: string | null) {
  const input = orderSchema.parse(raw);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ ...input, userId }))
    .digest("hex");
  return serial(async (tx) => {
    const existing = await tx.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      if (existing.fingerprint !== fingerprint)
        throw Error("Clé déjà utilisée pour une autre demande.");
      return existing;
    }
    const settings = await tx.settings.findUniqueOrThrow({
      where: { id: "main" },
    });
    if (!settings.orderingEnabled)
      throw Error("Les commandes sont momentanément fermées.");
    if (input.pickupAt) {
      const when = new Date(input.pickupAt).getTime();
      if (when < Date.now() + 5 * 60000 || when > Date.now() + 24 * 3600000)
        throw Error("Choisissez un retrait entre 5 minutes et 24 heures.");
    }
    const user = userId
      ? await tx.user.findUniqueOrThrow({ where: { id: userId } })
      : null;
    const products = await tx.product.findMany();
    const combos = await tx.combo.findMany();
    const priced = priceCart(
      input,
      products as MenuProduct[],
      combos as unknown as Bundle[],
      settings,
      !!user?.studentUntil && user.studentUntil > new Date(),
    );
    const reward = input.mode === "reward";
    if (reward) {
      if (!user?.verified) throw Error("Un compte vérifié est requis.");
      const held = await tx.user.updateMany({
        where: {
          id: user.id,
          points: { gte: 8 },
          AND: [{ points: { gte: user.reservedPoints + 8 } }],
        },
        data: { reservedPoints: { increment: 8 } },
      });
      if (held.count !== 1)
        throw Error("Vous avez besoin de 8 points disponibles.");
    }
    const campaign = input.campaignId
      ? await tx.campaign.findFirst({
          where: { id: input.campaignId, active: true },
        })
      : null;
    const order = await tx.order.create({
      data: {
        idempotencyKey: input.idempotencyKey,
        fingerprint,
        userId,
        customerName: input.customerName,
        phone: input.phone,
        pickupAt: input.pickupAt ? new Date(input.pickupAt) : null,
        note: input.note,
        mode: input.mode,
        ...priced,
        lines: priced.lines as unknown as Prisma.InputJsonValue,
        rewardHeld: reward,
        campaignId: campaign?.id,
      },
    });
    if (reward)
      await tx.ledger.create({
        data: {
          userId: user!.id,
          orderId: order.id,
          kind: "HOLD",
          delta: 0,
          reason: "8 points réservés au retrait payé",
        },
      });
    await tx.audit.create({
      data: {
        actorId: userId ?? "guest",
        action: "ORDER_REQUESTED",
        target: order.id,
        details: { total: order.total },
      },
    });
    return order;
  }).catch(async (error) => {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await db.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing && existing.fingerprint === fingerprint) return existing;
    }
    throw error;
  });
}
export async function moveOrder(
  actor: { id: string; role: Role },
  id: string,
  to: OrderStatus,
  receipt?: string,
) {
  return serial(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id } });
    if (order.status === to) return order;
    if (!canTransition(actor.role, order.status, to))
      throw Error("Transition ou permission refusée.");
    if (to === "COLLECTED" && (!receipt || receipt.trim().length < 3))
      throw Error("La référence du reçu payé est obligatoire.");
    const user = order.userId
      ? await tx.user.findUniqueOrThrow({ where: { id: order.userId } })
      : null;
    if (to === "COLLECTED" && user) {
      if (order.rewardHeld) {
        await tx.user.update({
          where: { id: user.id },
          data: { points: { decrement: 8 }, reservedPoints: { decrement: 8 } },
        });
        await tx.ledger.create({
          data: {
            userId: user.id,
            orderId: id,
            kind: "REDEEM",
            delta: -8,
            reason: "Deux articles identiques, un offert",
          },
        });
      } else if (user.verified && order.eligiblePoints > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: { points: { increment: order.eligiblePoints } },
        });
        await tx.ledger.create({
          data: {
            userId: user.id,
            orderId: id,
            kind: "EARN",
            delta: order.eligiblePoints,
            reason: "Repas payés et retirés",
          },
        });
      }
    }
    if (to === "CANCELED" && user && order.rewardHeld) {
      await tx.user.update({
        where: { id: user.id },
        data: { reservedPoints: { decrement: 8 } },
      });
      await tx.ledger.create({
        data: {
          userId: user.id,
          orderId: id,
          kind: "RELEASE",
          delta: 0,
          reason: "Réservation annulée",
        },
      });
    }
    if (to === "REFUNDED" && user) {
      const earned = await tx.ledger.findUnique({
        where: { orderId_kind: { orderId: id, kind: "EARN" } },
      });
      if (earned) {
        await tx.user.update({
          where: { id: user.id },
          data: { points: { decrement: earned.delta } },
        });
        await tx.ledger.create({
          data: {
            userId: user.id,
            orderId: id,
            kind: "REVERSE",
            delta: -earned.delta,
            reason:
              "Remboursement intégral; un solde négatif bloque les cadeaux",
          },
        });
      }
      if (order.rewardHeld) {
        await tx.user.update({
          where: { id: user.id },
          data: { points: { increment: 8 } },
        });
        await tx.ledger.create({
          data: {
            userId: user.id,
            orderId: id,
            kind: "RESTORE",
            delta: 8,
            reason: "Cadeau remboursé intégralement",
          },
        });
      }
    }
    const result = await tx.order.update({
      where: { id },
      data: {
        status: to,
        ...(to === "COLLECTED"
          ? { receipt: receipt!.trim().toUpperCase() }
          : {}),
      },
    });
    await tx.audit.create({
      data: {
        actorId: actor.id,
        action: `ORDER_${to}`,
        target: id,
        details: {
          from: order.status,
          receipt: to === "COLLECTED" ? receipt : null,
        },
      },
    });
    return result;
  });
}
