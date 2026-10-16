export type MenuProduct = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  cost: number | null;
  available: boolean;
  studentEligible: boolean;
  loyaltyEligible: boolean;
  rewardEligible: boolean;
  image: string | null;
};
export const categories = [
  "Tous",
  "Pizzas",
  "Fast food",
  "Plats",
  "Salades",
  "Crêpes",
  "Gaufres",
  "Boissons",
];
const rows: [string, string, number, string][] = [
  [
    "Gaufres",
    "Gaufre Nutella Amande Banane",
    16500,
    "Gaufre, sauce nutella, amande, banane",
  ],
  ["Gaufres", "Gaufre Nutella", 13900, "Gaufre, sauce nutella"],
  ["Gaufres", "Gaufre Nutella Fraise", 14900, "Gaufre, sauce nutella, fraise"],
  ["Gaufres", "Gaufre Nutella Banane", 14900, "Gaufre, sauce nutella, banane"],
  ["Boissons", "Boga Cidre 24cl", 3000, "Boisson gazeuse"],
  ["Boissons", "Boga Lim 24cl", 3000, "Boisson gazeuse"],
  ["Boissons", "Fanta Orange 24cl", 3000, "Boisson gazeuse"],
  ["Boissons", "Eau 0.5L", 1500, "Eau minérale"],
  ["Boissons", "Coca Cola Classique 24cl", 3000, "Boisson gazeuse"],
  [
    "Pizzas",
    "Pizza Fermière",
    15000,
    "Sauce tomate, mozzarella, lamelles de volaille, champignon, piment de cayenne",
  ],
  [
    "Pizzas",
    "Pizza Orientale",
    15000,
    "Sauce tomate, mozzarella, olives noires, poivron vert, œuf, merguez",
  ],
  [
    "Pizzas",
    "Pizza Turc",
    22000,
    "Sauce tomate, mozzarella, olives noires, poivron vert, œuf, merguez",
  ],
  ["Pizzas", "Pizza Régina", 15000, "Sauce tomate, mozzarella, jambon"],
  ["Pizzas", "Pizza Végétarienne", 12000, "Sauce tomate, mozzarella, légumes"],
  [
    "Pizzas",
    "Pizza Fruits de Mer",
    24000,
    "Sauce tomate, mozzarella, fruits de mer",
  ],
  ["Pizzas", "Pizza 4 Fromages", 18000, "Sauce tomate, 4 fromages"],
  ["Pizzas", "Pizza Neptune", 14000, "Sauce tomate, mozzarella, thon, olives"],
  ["Pizzas", "Pizza Romantica", 28000, "Spécial chef, ingredients to confirm"],
  ["Pizzas", "Pizza Margarita", 10000, "Sauce tomate, mozzarella, basilic"],
  [
    "Plats",
    "Plat Côtelette d'Agneau",
    29000,
    "Légumes, soule (source term to clarify), frites",
  ],
  [
    "Plats",
    "Plat Grillade Mixte",
    32000,
    "Merguez, escalope grillée, escalope panée",
  ],
  [
    "Plats",
    "Plat Filet de Bœuf",
    32000,
    "Légumes, soule (source term to clarify), riz",
  ],
  ["Plats", "Plat Cordon Bleu", 19000, "Salade, riz, frites"],
  ["Plats", "Plat Escalope Panée", 18000, "Salade, riz, frites"],
  ["Plats", "Plat Escalope Grillée", 17000, "Salade, riz, frites"],
  ["Crêpes", "Crêpe Nutella", 13900, "Crêpe, sauce nutella"],
  ["Crêpes", "Crêpe Nutella Banane", 14900, "Crêpe, sauce nutella, banane"],
  [
    "Fast food",
    "Burger Classic",
    9000,
    "Harissa, mayonnaise, laitue, tomate, oignon, olives, frites",
  ],
  [
    "Fast food",
    "Baguette Farcie",
    9000,
    "Choix entre escalope panée, grillée, cordon bleu",
  ],
  [
    "Fast food",
    "Cheese Burger",
    10000,
    "Harissa, mayonnaise, laitue, tomate, oignon, olives, frites",
  ],
  [
    "Fast food",
    "Makloub Escalope",
    9000,
    "Laitue, tomate, oignon, harissa, mayonnaise, frites",
  ],
  [
    "Fast food",
    "Makloub Thon",
    9000,
    "Laitue, tomate, oignon, harissa, mayonnaise, frites",
  ],
  [
    "Salades",
    "Salade Fruits de Mer",
    21000,
    "Laitue, tomate, croûtons, huile d'olive, fruits de mer",
  ],
  [
    "Salades",
    "Salade Tomate Mozzarella",
    12500,
    "Laitue, tomate, huile d'olive, mozzarella",
  ],
  [
    "Salades",
    "Salade César",
    18000,
    "Laitue, tomate, croûtons, huile d'olive, escalope",
  ],
  [
    "Salades",
    "Salade Romantica",
    21000,
    "Laitue, tomate, croûtons, huile d'olive",
  ],
  [
    "Salades",
    "Salade Tunisienne",
    12500,
    "Tomate, concombre, oignon, olives, œuf, thon",
  ],
  [
    "Salades",
    "Salade Niçoise",
    18000,
    "Laitue, tomate, croûtons, huile d'olive, œuf",
  ],
];
export const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const seedProducts: MenuProduct[] = rows.map(
  ([category, name, price, description]) => ({
    id: slug(name),
    name,
    price,
    description,
    category,
    cost: null,
    available: true,
    studentEligible: ["Pizzas", "Plats", "Fast food"].includes(category),
    loyaltyEligible: ["Pizzas", "Plats", "Fast food"].includes(category),
    rewardEligible: [
      "Burger Classic",
      "Cheese Burger",
      "Makloub Escalope",
      "Makloub Thon",
      "Baguette Farcie",
      "Pizza Margarita",
    ].includes(name),
    image:
      name.includes("Makloub") ||
      name.includes("Baguette") ||
      category === "Boissons" ||
      category === "Crêpes"
        ? null
        : category === "Pizzas"
          ? "/images/pizza.jpg"
          : category === "Fast food"
            ? "/images/burger.jpg"
            : category === "Salades"
              ? "/images/salad.jpg"
              : category === "Plats"
                ? "/images/grill.jpg"
                : "/images/waffle.jpg",
  }),
);
export type Bundle = {
  id: string;
  name: string;
  people: number;
  price: number;
  items: { productId: string; quantity: number }[];
  active: boolean;
};
export const seedCombos: Bundle[] = [
  {
    id: "duo",
    name: "Le Duo",
    people: 2,
    price: 36900,
    active: false,
    items: [
      { productId: "pizza-regina", quantity: 1 },
      { productId: "burger-classic", quantity: 2 },
      { productId: "boga-cidre-24cl", quantity: 2 },
    ],
  },
  {
    id: "trio",
    name: "Le Trio",
    people: 3,
    price: 56900,
    active: false,
    items: [
      { productId: "pizza-orientale", quantity: 1 },
      { productId: "pizza-margarita", quantity: 1 },
      { productId: "burger-classic", quantity: 3 },
      { productId: "boga-cidre-24cl", quantity: 3 },
    ],
  },
  {
    id: "squad",
    name: "Le Squad",
    people: 4,
    price: 74900,
    active: false,
    items: [
      { productId: "pizza-regina", quantity: 2 },
      { productId: "cheese-burger", quantity: 2 },
      { productId: "burger-classic", quantity: 2 },
      { productId: "boga-cidre-24cl", quantity: 4 },
    ],
  },
];
export const money = (millimes: number) => (millimes / 1000).toFixed(3);
