// Keep locale strings here as Arabic translations are introduced; format price
// independently so the source millimes remain exact in every locale.
export const locales = ["fr", "ar-TN"] as const;
export type Locale = (typeof locales)[number];
export const localeDirection: Record<Locale, "ltr" | "rtl"> = {
  fr: "ltr",
  "ar-TN": "rtl",
};
export const messages = {
  fr: { cart: "Panier", menu: "La carte", club: "Le Club", currency: "DT" },
  "ar-TN": { cart: "القفة", menu: "القائمة", club: "النادي", currency: "د.ت" },
};
