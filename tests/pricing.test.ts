import { describe, it, expect } from "vitest";
import { seedProducts, seedCombos, money } from "../src/lib/menu";
import {
  priceCart,
  cartSchema,
  canTransition,
  type CartInput,
} from "../src/lib/pricing";
const settings = {
  studentActive: true,
  studentPercent: 20,
  studentStartsAt: null,
  studentEndsAt: null,
  comboPoints: false,
};
const price = (
  items: CartInput["items"],
  mode: CartInput["mode"] = "standard",
  bundles: CartInput["bundles"] = [],
) =>
  priceCart(
    { items, mode, bundles },
    seedProducts,
    seedCombos.map((b) => ({ ...b, active: true })),
    settings,
    true,
  );
describe("complete exact menu", () => {
  it("has exactly 38 unique records, 7 categories and integer millimes", () => {
    expect(seedProducts).toHaveLength(38);
    expect(new Set(seedProducts.map((p) => p.id)).size).toBe(38);
    expect(new Set(seedProducts.map((p) => p.category)).size).toBe(7);
    expect(
      seedProducts.every(
        (p) =>
          Number.isInteger(p.price) &&
          p.description.length > 0 &&
          p.cost === null,
      ),
    ).toBe(true);
  });
  it("preserves every source price", () => {
    expect(
      Object.fromEntries(seedProducts.map((p) => [p.name, p.price])),
    ).toEqual({
      "Gaufre Nutella Amande Banane": 16500,
      "Gaufre Nutella": 13900,
      "Gaufre Nutella Fraise": 14900,
      "Gaufre Nutella Banane": 14900,
      "Boga Cidre 24cl": 3000,
      "Boga Lim 24cl": 3000,
      "Fanta Orange 24cl": 3000,
      "Eau 0.5L": 1500,
      "Coca Cola Classique 24cl": 3000,
      "Pizza Fermière": 15000,
      "Pizza Orientale": 15000,
      "Pizza Turc": 22000,
      "Pizza Régina": 15000,
      "Pizza Végétarienne": 12000,
      "Pizza Fruits de Mer": 24000,
      "Pizza 4 Fromages": 18000,
      "Pizza Neptune": 14000,
      "Pizza Romantica": 28000,
      "Pizza Margarita": 10000,
      "Plat Côtelette d'Agneau": 29000,
      "Plat Grillade Mixte": 32000,
      "Plat Filet de Bœuf": 32000,
      "Plat Cordon Bleu": 19000,
      "Plat Escalope Panée": 18000,
      "Plat Escalope Grillée": 17000,
      "Crêpe Nutella": 13900,
      "Crêpe Nutella Banane": 14900,
      "Burger Classic": 9000,
      "Baguette Farcie": 9000,
      "Cheese Burger": 10000,
      "Makloub Escalope": 9000,
      "Makloub Thon": 9000,
      "Salade Fruits de Mer": 21000,
      "Salade Tomate Mozzarella": 12500,
      "Salade César": 18000,
      "Salade Romantica": 21000,
      "Salade Tunisienne": 12500,
      "Salade Niçoise": 18000,
    });
  });
  it("displays exactly three decimals", () => {
    expect(money(9000)).toBe("9.000");
    expect(money(16500)).toBe("16.500");
    expect(money(1)).toBe("0.001");
  });
});
describe("server pricing", () => {
  it.each([
    ["burger-classic", 7200],
    ["cheese-burger", 8000],
    ["pizza-margarita", 8000],
    ["pizza-regina", 12000],
  ])("student %s costs %i", (productId, total) => {
    expect(price([{ productId, quantity: 1 }], "student").total).toBe(total);
  });
  it("excludes drinks and noneligible categories", () => {
    const result = price(
      [
        { productId: "boga-cidre-24cl", quantity: 1 },
        { productId: "gaufre-nutella", quantity: 1 },
      ],
      "student",
    );
    expect(result.total).toBe(16900);
    expect(result.eligiblePoints).toBe(0);
  });
  it.each([
    ["duo", 39000, 36900, 2100],
    ["trio", 61000, 56900, 4100],
    ["squad", 80000, 74900, 5100],
  ])("has honest %s bundle arithmetic", (id, subtotal, total, discount) => {
    const p = price([], "combo", [{ id, quantity: 1 }]);
    expect(p).toMatchObject({
      subtotal,
      total,
      discount,
      eligiblePoints: 0,
      cost: null,
    });
    expect(p.lines.reduce((s, l) => s + l.total, 0)).toBe(total);
    expect(p.lines.length).toBeGreaterThan(1);
  });
  it("only discounts the identical reward pair", () => {
    const p = price([{ productId: "burger-classic", quantity: 2 }], "reward");
    expect(p).toMatchObject({
      subtotal: 18000,
      total: 9000,
      discount: 9000,
      eligiblePoints: 0,
    });
  });
  it("rejects mixed, single or ineligible reward items", () => {
    expect(() =>
      price([{ productId: "burger-classic", quantity: 1 }], "reward"),
    ).toThrow();
    expect(() =>
      price(
        [
          { productId: "burger-classic", quantity: 2 },
          { productId: "eau-0-5l", quantity: 1 },
        ],
        "reward",
      ),
    ).toThrow();
    expect(() =>
      price([{ productId: "pizza-regina", quantity: 2 }], "reward"),
    ).toThrow();
  });
  it("rejects stacking, duplicate SKUs, unknown and unavailable items", () => {
    expect(() => price([], "student", [{ id: "duo", quantity: 1 }])).toThrow();
    expect(() =>
      price([
        { productId: "burger-classic", quantity: 1 },
        { productId: "burger-classic", quantity: 1 },
      ]),
    ).toThrow();
    expect(() => price([{ productId: "unknown", quantity: 1 }])).toThrow();
    expect(() =>
      priceCart(
        {
          items: [{ productId: "burger-classic", quantity: 1 }],
          mode: "standard",
          bundles: [],
        },
        seedProducts.map((p) => ({ ...p, available: false })),
        [],
        settings,
        true,
      ),
    ).toThrow();
  });
  it("requires active offers and verified students", () => {
    const c: CartInput = {
      items: [{ productId: "burger-classic", quantity: 1 }],
      mode: "student",
      bundles: [],
    };
    expect(() => priceCart(c, seedProducts, [], settings, false)).toThrow();
    expect(() =>
      priceCart(
        c,
        seedProducts,
        [],
        { ...settings, studentActive: false },
        true,
      ),
    ).toThrow();
    expect(() =>
      priceCart(
        c,
        seedProducts,
        [],
        { ...settings, studentEndsAt: new Date("2000-01-01") },
        true,
      ),
    ).toThrow();
    expect(() =>
      priceCart(
        { items: [], mode: "combo", bundles: [{ id: "duo", quantity: 1 }] },
        seedProducts,
        seedCombos,
        settings,
        true,
      ),
    ).toThrow();
  });
  it("ignores injected client prices and validates counts", () => {
    const cart = cartSchema.parse({
      items: [{ productId: "burger-classic", quantity: 1, price: 1 }],
      total: 1,
    });
    expect(price(cart.items).total).toBe(9000);
    expect(() =>
      cartSchema.parse({
        items: [{ productId: "burger-classic", quantity: -1 }],
      }),
    ).toThrow();
  });
  it("requires a baguette option", () => {
    expect(() =>
      price([{ productId: "baguette-farcie", quantity: 1 }]),
    ).toThrow();
    expect(
      price([
        { productId: "baguette-farcie", quantity: 1, option: "Cordon bleu" },
      ]).total,
    ).toBe(9000);
  });
  it("gives exactly one point per paid eligible meal unit", () => {
    expect(
      price([
        { productId: "pizza-regina", quantity: 3 },
        { productId: "burger-classic", quantity: 2 },
        { productId: "eau-0-5l", quantity: 4 },
      ]).eligiblePoints,
    ).toBe(5);
  });
});
describe("role and transition policy", () => {
  it("requires sequential lifecycle and cashier for payment", () => {
    expect(canTransition("CUSTOMER", "REQUESTED", "ACCEPTED")).toBe(false);
    expect(canTransition("KITCHEN", "REQUESTED", "ACCEPTED")).toBe(true);
    expect(canTransition("KITCHEN", "READY", "COLLECTED")).toBe(false);
    expect(canTransition("CASHIER", "READY", "COLLECTED")).toBe(true);
    expect(canTransition("OWNER", "REQUESTED", "COLLECTED")).toBe(false);
    expect(canTransition("OWNER", "COLLECTED", "REFUNDED")).toBe(true);
    expect(canTransition("OWNER", "REFUNDED", "COLLECTED")).toBe(false);
  });
});
