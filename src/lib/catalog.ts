import { db } from "./db";
import { seedProducts, seedCombos } from "./menu";
export async function catalog(includeCosts = false) {
  try {
    const [products, combos, settings] = await Promise.all([
      db.product.findMany({ orderBy: { name: "asc" } }),
      db.combo.findMany({ orderBy: { people: "asc" } }),
      db.settings.findUniqueOrThrow({ where: { id: "main" } }),
    ]);
    return {
      products: products.map((p) => (includeCosts ? p : { ...p, cost: null })),
      combos,
      settings,
      online: true,
    };
  } catch {
    return {
      products: seedProducts,
      combos: seedCombos,
      settings: {
        studentActive: false,
        studentPercent: 20,
        studentStartsAt: null,
        studentEndsAt: null,
        comboPoints: false,
        orderingEnabled: false,
        openingHours: "Horaires à confirmer par le restaurant",
        whatsapp: "",
        address: "Mahdia, Tunisie",
        mapsUrl:
          "https://www.google.com/maps/search/?api=1&query=Romantica+Mahdia+Tunisie",
      },
      online: false,
    };
  }
}
