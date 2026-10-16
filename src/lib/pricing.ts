import { z } from "zod";
import type { MenuProduct, Bundle } from "./menu";
export const cartSchema = z.object({
  mode: z.enum(["standard", "student", "combo", "reward"]).default("standard"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(20),
        option: z
          .enum(["Escalope panée", "Escalope grillée", "Cordon bleu"])
          .optional(),
      }),
    )
    .max(30),
  bundles: z
    .array(
      z.object({ id: z.string(), quantity: z.number().int().min(1).max(5) }),
    )
    .max(3)
    .default([]),
});
export type CartInput = z.infer<typeof cartSchema>;
export type PriceLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  cost: number | null;
  points: number;
  bundleId?: string;
  option?: string;
};
export type PricingSettings = {
  studentActive: boolean;
  studentPercent: number;
  studentStartsAt: Date | null;
  studentEndsAt: Date | null;
  comboPoints: boolean;
};
export function priceCart(
  cart: CartInput,
  products: MenuProduct[],
  bundles: Bundle[],
  settings: PricingSettings,
  studentVerified: boolean,
) {
  const lines: PriceLine[] = [];
  let subtotal = 0,
    total = 0;
  const seen = new Set<string>();
  if (!cart.items.length && !cart.bundles.length)
    throw Error("Le panier est vide.");
  if (cart.bundles.length && cart.mode !== "combo")
    throw Error("Les offres ne sont pas cumulables.");
  if (
    cart.mode === "student" &&
    (!settings.studentActive ||
      !studentVerified ||
      (settings.studentStartsAt && settings.studentStartsAt > new Date()) ||
      (settings.studentEndsAt && settings.studentEndsAt < new Date()))
  )
    throw Error("Offre étudiante inactive ou statut étudiant non vérifié.");
  const get = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p || !p.available) throw Error("Un article est indisponible.");
    return p;
  };
  for (const item of cart.items) {
    const p = get(item.productId);
    if (seen.has(p.id)) throw Error("Article dupliqué.");
    seen.add(p.id);
    if (p.id === "baguette-farcie" && !item.option)
      throw Error("Choisissez la garniture de la baguette.");
    const standard = p.price * item.quantity;
    const amount =
      cart.mode === "student" && p.studentEligible
        ? Math.round((p.price * (100 - settings.studentPercent)) / 100) *
          item.quantity
        : standard;
    subtotal += standard;
    total += amount;
    lines.push({
      productId: p.id,
      name: p.name,
      quantity: item.quantity,
      unitPrice: p.price,
      total: amount,
      cost: p.cost === null ? null : p.cost * item.quantity,
      points: p.loyaltyEligible ? item.quantity : 0,
      option: item.option,
    });
  }
  for (const entry of cart.bundles) {
    const b = bundles.find((x) => x.id === entry.id);
    if (!b?.active)
      throw Error("Cette formule attend la validation du restaurant.");
    let normal = 0;
    const start = lines.length;
    for (const i of b.items) {
      const p = get(i.productId);
      const qty = i.quantity * entry.quantity;
      normal += p.price * qty;
      lines.push({
        productId: p.id,
        name: p.name,
        quantity: qty,
        unitPrice: p.price,
        total: p.price * qty,
        cost: p.cost === null ? null : p.cost * qty,
        points: settings.comboPoints && p.loyaltyEligible ? qty : 0,
        bundleId: b.id,
      });
    }
    if (b.price > normal / entry.quantity)
      throw Error("Prix de formule invalide.");
    let allocated = 0;
    const target = b.price * entry.quantity;
    lines.slice(start).forEach((line, index, all) => {
      line.total =
        index === all.length - 1
          ? target - allocated
          : Math.round((target * line.total) / normal);
      allocated += line.total;
      if (line.total === 0) line.points = 0;
    });
    subtotal += normal;
    total += target;
  }
  if (cart.mode === "reward") {
    if (
      cart.bundles.length ||
      cart.items.length !== 1 ||
      cart.items[0].quantity !== 2
    )
      throw Error(
        "Le cadeau nécessite deux unités identiques, seules dans le panier.",
      );
    const p = get(cart.items[0].productId);
    if (!p.rewardEligible) throw Error("Article non éligible au cadeau.");
    total = p.price;
    lines[0].total = p.price;
    lines[0].points = 0;
  }
  if (lines.reduce((s, l) => s + l.quantity, 0) > 80)
    throw Error("Panier trop volumineux.");
  return {
    lines,
    subtotal,
    total,
    discount: subtotal - total,
    cost: lines.some((x) => x.cost === null)
      ? null
      : lines.reduce((s, x) => s + (x.cost ?? 0), 0),
    eligiblePoints: lines.reduce((s, x) => s + x.points, 0),
  };
}
export const transitions: Record<string, string[]> = {
  REQUESTED: ["ACCEPTED", "CANCELED"],
  ACCEPTED: ["PREPARING", "CANCELED"],
  PREPARING: ["READY", "CANCELED"],
  READY: ["COLLECTED", "CANCELED"],
  COLLECTED: ["REFUNDED"],
  CANCELED: [],
  REFUNDED: [],
};
export function canTransition(role: string, from: string, to: string) {
  return (
    !!transitions[from]?.includes(to) &&
    (role === "OWNER" ||
      role === "CASHIER" ||
      (role === "KITCHEN" && ["ACCEPTED", "PREPARING", "READY"].includes(to)))
  );
}
