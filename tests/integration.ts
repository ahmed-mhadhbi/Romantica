import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient, OrderStatus } from "@prisma/client";
import { placeOrder, moveOrder } from "../src/lib/orders";
import { seedProducts, seedCombos } from "../src/lib/menu";
if (!process.env.DATABASE_URL?.includes("romantica_test"))
  throw Error("Use a dedicated romantica_test database.");
const db = new PrismaClient();
const prefix = `test-${randomUUID()}`;
async function run() {
  for (const p of seedProducts)
    await db.product.upsert({ where: { id: p.id }, create: p, update: {} });
  for (const b of seedCombos)
    await db.combo.upsert({
      where: { id: b.id },
      create: { ...b, items: b.items as Prisma.InputJsonValue },
      update: {},
    });
  await db.settings.upsert({
    where: { id: "main" },
    create: { id: "main", orderingEnabled: true },
    update: { orderingEnabled: true },
  });
  const user = await db.user.create({
    data: {
      email: `${prefix}@example.com`,
      name: "Test Customer",
      password: "not-a-login-hash",
      verified: true,
      points: 8,
    },
  });
  const actor = await db.user.create({
    data: {
      email: `${prefix}-owner@example.com`,
      name: "Test Owner",
      password: "not-a-login-hash",
      role: "OWNER",
    },
  });
  const body = (mode = "standard", quantity = 1) => ({
    idempotencyKey: randomUUID(),
    mode,
    items: [{ productId: "burger-classic", quantity }],
    bundles: [],
    customerName: "Test Customer",
    phone: "22123456",
  });
  const fulfill = async (id: string, receipt = randomUUID()) => {
    for (const status of [
      "ACCEPTED",
      "PREPARING",
      "READY",
      "COLLECTED",
    ] as OrderStatus[])
      await moveOrder(
        actor,
        id,
        status,
        status === "COLLECTED" ? receipt : undefined,
      );
  };
  try {
    const input = body();
    const first = await placeOrder(input, user.id);
    assert.equal(first.total, 9000);
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).points,
      8,
      "unpaid must not earn",
    );
    const duplicate = await placeOrder(input, user.id);
    assert.equal(duplicate.id, first.id);
    await assert.rejects(() =>
      moveOrder(
        { id: actor.id, role: "KITCHEN" },
        first.id,
        "COLLECTED",
        "fake",
      ),
    );
    await assert.rejects(() => moveOrder(actor, first.id, "COLLECTED", "fake"));
    await fulfill(first.id);
    await moveOrder(actor, first.id, "COLLECTED", "ignored");
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).points,
      9,
    );
    assert.equal(
      await db.ledger.count({ where: { orderId: first.id, kind: "EARN" } }),
      1,
    );
    await moveOrder(actor, first.id, "REFUNDED");
    await moveOrder(actor, first.id, "REFUNDED");
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).points,
      8,
    );
    const concurrent = await Promise.allSettled([
      placeOrder(body("reward", 2), user.id),
      placeOrder(body("reward", 2), user.id),
    ]);
    assert.equal(
      concurrent.filter((x) => x.status === "fulfilled").length,
      1,
      "only one reward may reserve 8 points",
    );
    const reward = (
      concurrent.find(
        (x) => x.status === "fulfilled",
      ) as PromiseFulfilledResult<Awaited<ReturnType<typeof placeOrder>>>
    ).value;
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
        .reservedPoints,
      8,
    );
    assert.equal(reward.total, 9000);
    await fulfill(reward.id);
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).points,
      0,
    );
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
        .reservedPoints,
      0,
    );
    assert.equal(
      await db.ledger.count({ where: { orderId: reward.id, kind: "REDEEM" } }),
      1,
    );
    assert.equal(
      await db.ledger.count({ where: { orderId: reward.id, kind: "EARN" } }),
      0,
    );
    await moveOrder(actor, reward.id, "REFUNDED");
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).points,
      8,
    );
    const canceled = await placeOrder(body("reward", 2), user.id);
    await moveOrder(actor, canceled.id, "CANCELED");
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
        .reservedPoints,
      0,
    );
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).points,
      8,
    );
    const orderA = await placeOrder(body(), user.id);
    const orderB = await placeOrder(body(), user.id);
    const receipt = randomUUID();
    await fulfill(orderA.id, receipt);
    for (const status of ["ACCEPTED", "PREPARING", "READY"] as OrderStatus[])
      await moveOrder(actor, orderB.id, status);
    await assert.rejects(() =>
      moveOrder(actor, orderB.id, "COLLECTED", receipt),
    );
    assert.equal(
      (await db.order.findUniqueOrThrow({ where: { id: orderB.id } })).status,
      "READY",
      "duplicate receipt must roll back",
    );
    assert.equal(
      await db.ledger.count({ where: { orderId: orderB.id, kind: "EARN" } }),
      0,
    );
    await db.user.update({ where: { id: user.id }, data: { verified: false } });
    await moveOrder(actor, orderB.id, "COLLECTED", randomUUID());
    assert.equal(
      await db.ledger.count({ where: { orderId: orderB.id, kind: "EARN" } }),
      0,
      "unverified accounts cannot earn",
    );
    const guest = await placeOrder(body(), null);
    await fulfill(guest.id);
    assert.equal(await db.ledger.count({ where: { orderId: guest.id } }), 0);
    const duplicateInput = body();
    const same = await Promise.all([
      placeOrder(duplicateInput, user.id),
      placeOrder(duplicateInput, user.id),
    ]);
    assert.equal(
      same[0].id,
      same[1].id,
      "concurrent retries return same order",
    );
    console.log(
      "PASS: PostgreSQL transactions, concurrent rewards and retries, 8-point debit, duplicate receipts, earning, verification, refunds, guest checkout, cancellation and permissions.",
    );
  } finally {
    const orders = await db.order.findMany({
      where: { OR: [{ userId: user.id }, { customerName: "Test Customer" }] },
      select: { id: true },
    });
    const ids = orders.map((x) => x.id);
    await db.ledger.deleteMany({ where: { orderId: { in: ids } } });
    await db.order.deleteMany({ where: { id: { in: ids } } });
    await db.audit.deleteMany({
      where: {
        OR: [{ actorId: { in: [user.id, actor.id] } }, { target: { in: ids } }],
      },
    });
    await db.user.deleteMany({ where: { id: { in: [user.id, actor.id] } } });
  }
}
run().finally(() => db.$disconnect());
