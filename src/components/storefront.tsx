"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  ShoppingBag,
  Plus,
  Minus,
  X,
  Search,
  MapPin,
  Clock,
  Flame,
  Users,
  Check,
  Leaf,
  Star,
  Gift,
  GraduationCap,
  Menu as MenuIcon,
  Heart,
  LogOut,
  LoaderCircle,
  UtensilsCrossed,
  CheckCircle2,
  Download,
} from "lucide-react";
import { categories, money, type MenuProduct, type Bundle } from "@/lib/menu";
import { type CartInput } from "@/lib/pricing";
export type Catalog = {
  products: MenuProduct[];
  combos: Bundle[];
  settings: {
    studentActive: boolean;
    studentPercent: number;
    studentStartsAt: string | null;
    studentEndsAt: string | null;
    comboPoints: boolean;
    orderingEnabled: boolean;
    openingHours: string;
    whatsapp: string;
    address: string;
    mapsUrl: string;
  };
  online: boolean;
};
export type Account = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    verified: boolean;
    studentUntil: string | null;
    points: number;
    reservedPoints: number;
    marketingConsent: boolean;
  } | null;
  orders?: {
    id: string;
    status: string;
    total: number;
    createdAt: string;
    eligiblePoints: number;
    mode: string;
    lines: { name: string; quantity: number }[];
  }[];
  ledger?: {
    id: string;
    kind: string;
    delta: number;
    reason: string;
    createdAt: string;
  }[];
};
export const statusLabels: Record<string, string> = {
  REQUESTED: "En attente d’acceptation",
  ACCEPTED: "Acceptée",
  PREPARING: "En préparation",
  READY: "Prête à retirer",
  COLLECTED: "Retirée et payée",
  CANCELED: "Annulée",
  REFUNDED: "Remboursée",
};
export async function api(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw Error(data.error ?? "Service indisponible.");
  return data;
}
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand ${light ? "light" : ""}`}
      aria-label="Romantica, accueil"
    >
      <span className="brand-mark">
        <UtensilsCrossed size={22} />
      </span>
      <span>
        ROMANTICA<small>RESTAURANT & CLUB</small>
      </span>
    </Link>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    const modal = document.querySelector<HTMLElement>("[data-dialog]");
    modal?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab" && modal) {
        const nodes = Array.from(
          modal.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input,select,textarea,a[href],[tabindex="0"]',
          ),
        );
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      prev?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        data-dialog
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? "wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function AccountPanel({
  onClose,
  onUser,
  onReward,
}: {
  onClose: () => void;
  onUser: (a: Account) => void;
  onReward?: (id: string) => void;
}) {
  const [account, setAccount] = useState<Account | null>(null);
  const [register, setRegister] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const refresh = () =>
      api("me")
        .then((a) => {
          setAccount(a);
          onUser(a);
        })
        .catch((e) => setError(e.message));
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [onUser]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      await api("auth", "POST", {
        action: register ? "register" : "login",
        name: register ? data.get("name") : undefined,
        email: data.get("email"),
        password: data.get("password"),
        marketingConsent: data.get("marketing") === "on",
      });
      const a = await api("me");
      setAccount(a);
      onUser(a);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const u = account?.user;
  const available = u ? Math.max(0, u.points - u.reservedPoints) : 0;
  return (
    <Modal
      title={u ? "Bienvenue au Club" : "Votre place au Club"}
      onClose={onClose}
      wide={!!u}
    >
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!account && !error ? (
        <p>Chargement…</p>
      ) : u ? (
        <>
          <div className="account-top">
            <div>
              <p className="eyebrow">ROMANTICA CLUB</p>
              <h3>Bonjour, {u.name.split(" ")[0]}.</h3>
              <p>Les bons moments se collectionnent.</p>
            </div>
            <button
              className="text-button"
              onClick={async () => {
                await api("logout", "POST");
                setAccount({ user: null });
                onUser({ user: null });
              }}
            >
              <LogOut size={16} /> Déconnexion
            </button>
          </div>
          <div className="club-pass">
            <div className="pass-top">
              <span>VOTRE CARTE DE FIDÉLITÉ</span>
              <UtensilsCrossed />
            </div>
            <h3>
              {available} <span>points disponibles</span>
            </h3>
            <div className="stamps">
              {Array.from({ length: 8 }, (_, i) => (
                <span
                  key={i}
                  className={i < Math.min(available, 8) ? "stamped" : ""}
                >
                  {i < Math.min(available, 8) ? (
                    <Check size={20} />
                  ) : i === 7 ? (
                    <Gift size={20} />
                  ) : (
                    i + 1
                  )}
                </span>
              ))}
            </div>
            <p>
              {available >= 8
                ? "Votre cadeau est débloqué. À vous de choisir !"
                : `Encore ${8 - Math.min(available, 8)} repas éligibles avant votre cadeau.`}
            </p>
          </div>
          <div className="account-metrics">
            <div>
              <strong>
                {account.orders
                  ?.filter(
                    (o) =>
                      !["COLLECTED", "CANCELED", "REFUNDED"].includes(o.status),
                  )
                  .reduce((s, o) => s + o.eligiblePoints, 0) ?? 0}
              </strong>
              <small>points potentiels en attente</small>
            </div>
            <div>
              <strong>{u.reservedPoints}</strong>
              <small>points réservés pour un cadeau</small>
            </div>
            <div>
              <strong>{u.verified ? "Vérifié" : "À vérifier"}</strong>
              <small>Présentez votre compte à la caisse</small>
            </div>
          </div>
          <h3>Deux fois plus de plaisir.</h3>
          <p className="muted">
            Avec 8 points : commandez deux articles identiques éligibles,
            payez-en un au tarif normal. Le second est offert. Aucun cumul avec
            une autre offre. Les points sont débités au retrait payé.
          </p>
          {onReward && available >= 8 && u.verified && (
            <button
              className="button"
              onClick={() => {
                onClose();
                document
                  .getElementById("la-carte")
                  ?.scrollIntoView({ behavior: "smooth" });
                onReward("");
              }}
            >
              Choisir mon cadeau <Gift size={17} />
            </button>
          )}
          <h3 className="section-gap">Mes commandes</h3>
          {!account.orders?.length ? (
            <p className="empty">
              Votre première histoire commence à la carte.
            </p>
          ) : (
            account.orders.map((o) => (
              <article className="history-row" key={o.id}>
                <div>
                  <strong>#{o.id.slice(-6).toUpperCase()}</strong>
                  <small>
                    {new Date(o.createdAt).toLocaleDateString("fr-TN")} ·{" "}
                    {o.lines.map((l) => `${l.quantity}× ${l.name}`).join(", ")}
                  </small>
                </div>
                <div>
                  <span className="badge">{statusLabels[o.status]}</span>
                  <strong>{money(o.total)} DT</strong>
                </div>
              </article>
            ))
          )}
          <details>
            <summary>Journal de mes points</summary>
            {account.ledger?.length ? (
              account.ledger.map((l) => (
                <p key={l.id}>
                  {new Date(l.createdAt).toLocaleDateString("fr-TN")} ·{" "}
                  {l.delta > 0 ? "+" : ""}
                  {l.delta} · {l.reason}
                </p>
              ))
            ) : (
              <p>Aucun mouvement pour le moment.</p>
            )}
          </details>
          <label className="check-label">
            <input
              type="checkbox"
              checked={u.marketingConsent}
              onChange={async (e) => {
                try {
                  await api("me", "PATCH", {
                    marketingConsent: e.target.checked,
                  });
                  const a = await api("me");
                  setAccount(a);
                  onUser(a);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            />{" "}
            Recevoir les nouveautés et offres. Désinscription à tout moment ici.
          </label>
          {u.role !== "CUSTOMER" && (
            <a href="/staff" className="button secondary">
              Ouvrir l’espace équipe <ArrowUpRight size={16} />
            </a>
          )}
        </>
      ) : (
        <>
          <p className="muted">
            Un repas, un point. Huit points, un moment offert.
          </p>
          <div className="segmented">
            <button
              className={!register ? "selected" : ""}
              onClick={() => setRegister(false)}
            >
              Se connecter
            </button>
            <button
              className={register ? "selected" : ""}
              onClick={() => setRegister(true)}
            >
              Rejoindre le Club
            </button>
          </div>
          <form onSubmit={submit} className="form">
            {register && (
              <label>
                Votre prénom et nom
                <input name="name" autoComplete="name" required minLength={2} />
              </label>
            )}
            <label>
              Adresse e-mail
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Mot de passe
              <input
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={12}
              />
              <small>12 caractères minimum.</small>
            </label>
            {register && (
              <>
                <p className="muted small">
                  Votre compte sera vérifié en caisse pour activer la fidélité.
                  Vos coordonnées servent au suivi de vos commandes.
                </p>
                <label className="check-label">
                  <input type="checkbox" name="marketing" /> Je souhaite
                  recevoir les offres Romantica (facultatif).
                </label>
              </>
            )}
            <button className="button full" disabled={busy}>
              {busy ? (
                <LoaderCircle className="spin" />
              ) : register ? (
                "Créer mon compte"
              ) : (
                "Se connecter"
              )}
              <ArrowRight size={18} />
            </button>
          </form>
        </>
      )}
    </Modal>
  );
}
export default function Storefront({ initial }: { initial: Catalog }) {
  const [data, setData] = useState(initial);
  const [category, setCategory] = useState("Tous");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartInput>({
    items: [],
    bundles: [],
    mode: "standard",
  });
  const [drawer, setDrawer] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [account, setAccount] = useState<Account>({ user: null });
  const [detail, setDetail] = useState<MenuProduct | null>(null);
  const [option, setOption] = useState("Escalope panée");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ id: string; total: number } | null>(
    null,
  );
  const [rewardPick, setRewardPick] = useState(false);
  const [filter, setFilter] = useState("all");
  const [mobileNav, setMobileNav] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<
    (Event & { prompt: () => Promise<void> }) | null
  >(null);
  const [feedback, setFeedback] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("romantica-cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed.items) &&
          Array.isArray(parsed.bundles) &&
          ["standard", "student", "combo", "reward"].includes(parsed.mode)
        )
          setCart(parsed);
      }
    } catch {}
    api("me")
      .then(setAccount)
      .catch(() => {});
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    const listen = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as Event & { prompt: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", listen);
    const campaign = new URLSearchParams(location.search).get("campaign");
    if (campaign) sessionStorage.setItem("romantica-campaign", campaign);
    return () => window.removeEventListener("beforeinstallprompt", listen);
  }, []);
  useEffect(() => {
    localStorage.setItem("romantica-cart", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!drawer) return;
    api("catalog")
      .then(setData)
      .catch(() => {});
  }, [drawer]);
  const studentLive =
    data.settings.studentActive &&
    (!data.settings.studentStartsAt ||
      new Date(data.settings.studentStartsAt) <= new Date()) &&
    (!data.settings.studentEndsAt ||
      new Date(data.settings.studentEndsAt) >= new Date());
  const studentVerified =
    !!account.user?.studentUntil &&
    new Date(account.user.studentUntil) > new Date();
  const subtotal =
    cart.items.reduce(
      (s, i) =>
        s +
        (data.products.find((p) => p.id === i.productId)?.price ?? 0) *
          i.quantity,
      0,
    ) +
    cart.bundles.reduce(
      (s, b) =>
        s +
        (data.combos
          .find((c) => c.id === b.id)
          ?.items.reduce(
            (n, i) =>
              n +
              (data.products.find((p) => p.id === i.productId)?.price ?? 0) *
                i.quantity,
            0,
          ) ?? 0) *
          b.quantity,
      0,
    );
  const estimate =
    cart.items.reduce((s, i) => {
      const p = data.products.find((p) => p.id === i.productId);
      return (
        s +
        (p
          ? (cart.mode === "reward"
              ? p.price / 2
              : cart.mode === "student" && p.studentEligible
                ? Math.round(
                    (p.price * (100 - data.settings.studentPercent)) / 100,
                  )
                : p.price) * i.quantity
          : 0)
      );
    }, 0) +
    cart.bundles.reduce(
      (s, b) =>
        s + (data.combos.find((c) => c.id === b.id)?.price ?? 0) * b.quantity,
      0,
    );
  const count =
    cart.items.reduce((s, i) => s + i.quantity, 0) +
    cart.bundles.reduce((s, b) => s + b.quantity, 0);
  function add(p: MenuProduct, choice?: string) {
    if (!p.available) return;
    if (rewardPick) {
      if (!p.rewardEligible) {
        setToast("Choisissez un article marqué « Cadeau Club ».");
        return;
      }
      setCart({
        mode: "reward",
        items: [
          {
            productId: p.id,
            quantity: 2,
            option: choice as CartInput["items"][number]["option"],
          },
        ],
        bundles: [],
      });
      setRewardPick(false);
      setDrawer(true);
      setDetail(null);
      return;
    }
    if (p.id === "baguette-farcie" && !choice) {
      setDetail(p);
      return;
    }
    if (cart.mode === "reward") {
      setToast(
        "Terminez ou videz votre panier cadeau avant d’ajouter un article.",
      );
      return;
    }
    setCart((c) => ({
      ...c,
      items: c.items.some((i) => i.productId === p.id)
        ? c.items.map((i) =>
            i.productId === p.id
              ? { ...i, quantity: Math.min(20, i.quantity + 1) }
              : i,
          )
        : [
            ...c.items,
            {
              productId: p.id,
              quantity: 1,
              option: choice as CartInput["items"][number]["option"],
            },
          ],
    }));
    setToast(`${p.name} ajouté au panier`);
    setDetail(null);
  }
  function addBundle(b: Bundle) {
    if (!b.active) return;
    if (["student", "reward"].includes(cart.mode)) {
      setToast(
        "Les offres ne sont pas cumulables. Videz votre panier avant de changer d’offre.",
      );
      return;
    }
    setCart((c) => ({
      ...c,
      mode: "combo",
      bundles: c.bundles.some((x) => x.id === b.id)
        ? c.bundles.map((x) =>
            x.id === b.id ? { ...x, quantity: Math.min(5, x.quantity + 1) } : x,
          )
        : [...c.bundles, { id: b.id, quantity: 1 }],
    }));
    setToast(`${b.name} ajouté au panier`);
  }
  async function checkout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const request = {
      ...cart,
      customerName: form.get("name"),
      phone: form.get("phone"),
      pickupAt: form.get("time")
        ? new Date(String(form.get("time"))).toISOString()
        : null,
      note: form.get("note"),
      campaignId: sessionStorage.getItem("romantica-campaign") ?? undefined,
    };
    const requestString = JSON.stringify(request);
    let key = sessionStorage.getItem("romantica-checkout-key");
    if (
      sessionStorage.getItem("romantica-checkout-body") !== requestString ||
      !key
    ) {
      key = crypto.randomUUID();
      sessionStorage.setItem("romantica-checkout-key", key);
      sessionStorage.setItem("romantica-checkout-body", requestString);
    }
    try {
      const result = await api("orders", "POST", {
        ...request,
        idempotencyKey: key,
      });
      setReceipt(result.order);
      setCart({ items: [], bundles: [], mode: "standard" });
      sessionStorage.removeItem("romantica-checkout-key");
      api("me")
        .then(setAccount)
        .catch(() => {});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const filtered = data.products.filter(
    (p) =>
      (category === "Tous" || p.category === category) &&
      `${p.name} ${p.description}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter !== "reward" || p.rewardEligible) &&
      (filter !== "student" || p.studentEligible),
  );
  const ordered = [...filtered].sort((a, b) => {
    const favorites = [
      "pizza-regina",
      "burger-classic",
      "pizza-margarita",
      "salade-cesar",
      "makloub-escalope",
      "plat-cordon-bleu",
      "gaufre-nutella",
      "cheese-burger",
    ];
    return (
      (favorites.indexOf(a.id) < 0 ? 99 : favorites.indexOf(a.id)) -
      (favorites.indexOf(b.id) < 0 ? 99 : favorites.indexOf(b.id))
    );
  });
  return (
    <>
      <div className="announcement">
        <span>DE BONS PLATS. DE VRAIS MOMENTS.</span>
        <span>
          Mahdia, Tunisie <span className="tiny-star">✦</span> À emporter & à
          partager
        </span>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav className={mobileNav ? "open" : ""}>
            <a href="#la-carte" onClick={() => setMobileNav(false)}>
              La carte
            </a>
            <a href="#a-partager" onClick={() => setMobileNav(false)}>
              À partager
            </a>
            <a href="#le-club" onClick={() => setMobileNav(false)}>
              Le Club <span className="nav-dot" />
            </a>
            <a href="#nous-trouver" onClick={() => setMobileNav(false)}>
              Nous trouver
            </a>
          </nav>
          <div className="header-actions">
            <button
              className="account-btn"
              onClick={() => setAccountOpen(true)}
            >
              <span className="avatar">
                {account.user ? account.user.name[0] : <Heart size={15} />}
              </span>
              <span>{account.user ? "Mon Club" : "Rejoindre le Club"}</span>
            </button>
            <button
              className="bag-btn"
              onClick={() => {
                setDrawer(true);
                setReceipt(null);
              }}
              aria-label={`Ouvrir le panier, ${count} articles`}
            >
              <ShoppingBag size={19} />
              <span>{count}</span>
            </button>
            <button
              className="icon-btn mobile-only"
              onClick={() => setMobileNav((v) => !v)}
              aria-label="Navigation"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>
      <main>
        <section className="hero content">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="line" /> LA BONNE ADRESSE À MAHDIA
            </div>
            <h1>
              Les bons moments
              <br />
              ont du <em>goût.</em>
              <span className="headline-star">✳</span>
            </h1>
            <p>
              Une pizza à partager. Un burger qui fait plaisir.
              <br className="desktop-only" /> Et toujours une bonne raison de se
              retrouver.
            </p>
            <div className="hero-buttons">
              <a className="button" href="#la-carte">
                Ça vous tente ? <ArrowUpRight size={20} />
              </a>
              <a className="link-button" href="#a-partager">
                On partage ? <ArrowRight size={17} />
              </a>
            </div>
            <div className="hero-foot">
              <span>
                <UtensilsCrossed size={16} /> Préparé à la commande
              </span>
              <span className="divider" />
              <span>
                <MapPin size={16} /> Le goût de Mahdia
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <img
              src="/images/pizza.jpg"
              alt="Suggestion de présentation : une pizza au four"
              className="hero-food"
              fetchPriority="high"
            />
            <div className="image-shade" />
            <div className="round-seal">
              <span>FAIT POUR</span>
              <Heart size={25} />
              <span>SE RETROUVER</span>
            </div>
            <div className="hero-image-caption">
              <span>LES CLASSIQUES QU’ON AIME.</span>
              <span>LES MOMENTS QUI RESTENT.</span>
            </div>
            <div className="hero-floating">
              <span className="floating-icon">
                <Flame size={23} />
              </span>
              <div>
                <strong>La pause qu’il vous faut.</strong>
                <small>Vous choisissez. On s’occupe du goût.</small>
              </div>
            </div>
          </div>
        </section>
        <div className="ticker" aria-hidden="true">
          <div>
            <span>PIZZAS AU FOUR</span>✦<span>BURGERS GÉNÉREUX</span>✦
            <span>PAUSES GOURMANDES</span>✦<span>BONS MOMENTS</span>✦
            <span>ROMANTICA CLUB</span>✦<span>PIZZAS AU FOUR</span>
          </div>
        </div>
        <section className="content discovery">
          <div className="section-heading">
            <div>
              <p className="eyebrow">BIEN MANGER, ENCORE MIEUX SE RETROUVER</p>
              <h2>
                À chaque envie, <em>son moment.</em>
              </h2>
            </div>
            <span className="section-note">
              Votre prochaine bonne idée est ici. <ArrowDownRight />
            </span>
          </div>
          <div className="moment-grid">
            <a href="#la-carte" className="moment-card red">
              <div>
                <span className="mini-label">
                  <Flame size={13} /> LES ENVIES DU JOUR
                </span>
                <h3>
                  Votre prochain
                  <br />
                  coup de cœur.
                </h3>
                <p>
                  Les classiques Romantica,
                  <br />
                  tout simplement.
                </p>
                <span className="circle-arrow">
                  <ArrowUpRight size={19} />
                </span>
              </div>
              <img
                src="/images/burger.jpg"
                alt="Suggestion de burger"
                loading="lazy"
              />
            </a>
            <a href="#etudiants" className="moment-card olive">
              <div>
                <span className="mini-label">
                  <GraduationCap size={15} /> LA PAUSE CAMPUS
                </span>
                <h3>
                  Petit budget.
                  <br />
                  Grand appétit.
                </h3>
                <p>
                  {studentLive
                    ? `−${data.settings.studentPercent}% sur les repas éligibles.`
                    : "Une offre étudiante en préparation."}
                  <br />
                  Sur présentation d’un statut vérifié.
                </p>
                <span className="circle-arrow">
                  <ArrowUpRight size={19} />
                </span>
              </div>
              <span className="offer-number">
                −{data.settings.studentPercent}
                <small>%</small>
                <span>{studentLive ? "OFFRE ACTIVÉE" : "PROPOSITION"}</span>
              </span>
            </a>
            <a href="#le-club" className="moment-card cream">
              <div>
                <span className="mini-label">
                  <Gift size={14} /> LA FIDÉLITÉ A DU GOÛT
                </span>
                <h3>
                  8 repas.
                  <br />
                  Un vrai cadeau.
                </h3>
                <p>
                  Deux fois votre favori.
                  <br />
                  Un seul à payer.
                </p>
                <span className="circle-arrow">
                  <ArrowUpRight size={19} />
                </span>
              </div>
              <span className="stamp-art">
                <UtensilsCrossed size={48} />
                <small>LE CLUB</small>
              </span>
            </a>
          </div>
          <p className="offer-disclosure">
            {data.combos.some((b) => b.active) || studentLive
              ? "Offres actives indiquées sur chaque formule. Conditions ci-dessous."
              : "Les offres étudiantes et formules proposées attendent la validation du restaurant."}{" "}
            Aucun cumul des offres.
          </p>
        </section>
        <section id="la-carte" className="menu-section">
          <div className="content">
            <div className="section-heading menu-heading">
              <div>
                <p className="eyebrow">FAITES-VOUS PLAISIR</p>
                <h2>
                  La carte <em>Romantica.</em>
                </h2>
              </div>
              <label className="search">
                <Search size={18} />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Une envie en particulier ?"
                  aria-label="Rechercher dans la carte"
                />
                <kbd>⌕</kbd>
              </label>
            </div>
            <div className="category-row">
              {categories.map((c) => (
                <button
                  className={`category ${category === c ? "active" : ""}`}
                  key={c}
                  onClick={() => setCategory(c)}
                >
                  {c === "Tous" ? <UtensilsCrossed size={16} /> : null}
                  {c}
                </button>
              ))}
            </div>
            <div className="menu-meta">
              <span>
                <strong>{filtered.length}</strong> bonnes raisons de se régaler
              </span>
              <label>
                Afficher{" "}
                <select
                  aria-label="Filtrer les articles"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">Toute la carte</option>
                  <option value="student">Éligibles étudiants</option>
                  <option value="reward">Cadeaux Club</option>
                </select>
              </label>
            </div>
            {rewardPick && (
              <div className="notice">
                <Gift size={18} /> Choisissez votre cadeau : deux unités
                identiques, un seul article payé.{" "}
                <button onClick={() => setRewardPick(false)}>Annuler</button>
              </div>
            )}
            <div className="product-grid">
              {(category === "Tous" && !search && filter === "all" && !expanded
                ? ordered.slice(0, 8)
                : ordered
              ).map((p, i) => (
                <article
                  key={p.id}
                  className={`product-card ${!p.available ? "unavailable" : ""}`}
                >
                  <button
                    className="product-image"
                    onClick={() => {
                      setDetail(p);
                      setOption("Escalope panée");
                    }}
                    aria-label={`Détails de ${p.name}`}
                  >
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={`Suggestion de présentation — ${p.category}`}
                        loading="lazy"
                      />
                    ) : (
                      <div className="photo-placeholder">
                        <UtensilsCrossed size={36} />
                        <span>LE GOÛT ROMANTICA</span>
                      </div>
                    )}
                    {i < 2 && category === "Tous" && (
                      <span className="image-tag">
                        {i === 0 ? "LA PAUSE PIZZA" : "LE CLASSIQUE"}
                      </span>
                    )}
                    {!p.available && (
                      <span className="image-tag">Indisponible</span>
                    )}
                    <span className="image-open">
                      <ArrowUpRight size={17} />
                    </span>
                  </button>
                  <div className="product-body">
                    <div className="product-category">
                      {p.category}
                      {p.rewardEligible && (
                        <span>
                          <Gift size={12} /> Cadeau Club
                        </span>
                      )}
                    </div>
                    <button
                      className="product-title"
                      onClick={() => setDetail(p)}
                    >
                      <h3>{p.name}</h3>
                    </button>
                    <p>{p.description}</p>
                    <div className="product-bottom">
                      <div>
                        {studentLive && p.studentEligible && (
                          <small className="old-price">
                            {money(p.price)} DT
                          </small>
                        )}
                        <strong>
                          {money(
                            studentLive && p.studentEligible
                              ? Math.round(
                                  (p.price *
                                    (100 - data.settings.studentPercent)) /
                                    100,
                                )
                              : p.price,
                          )}{" "}
                          <small>DT</small>
                        </strong>
                        {studentLive && p.studentEligible && (
                          <small className="student-price">
                            Tarif étudiant vérifié · normal {money(p.price)} DT
                          </small>
                        )}
                      </div>
                      <button
                        disabled={!p.available}
                        className="add-button"
                        onClick={() => add(p)}
                        aria-label={`Ajouter ${p.name}`}
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {category === "Tous" && !search && filter === "all" && (
              <div className="menu-expand">
                <button
                  className="button secondary"
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded ? "Voir la sélection" : "Explorer les 38 articles"}
                  <ArrowRight size={17} />
                </button>
              </div>
            )}
            {filtered.length === 0 && (
              <div className="empty">
                Aucun plat ne correspond à cette envie. Essayez une autre
                recherche.
              </div>
            )}
            <div className="menu-bottom-note">
              <Leaf size={16} />
              <p>
                Une question sur les ingrédients ou les allergènes ? Parlez-en à
                notre équipe avant de commander.
              </p>
            </div>
            <p className="photo-note">
              Photos d’illustration · Les présentations peuvent varier. Photos
              du restaurant à venir.
            </p>
          </div>
        </section>
        <section id="a-partager" className="content combos-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PLUS ON EST, PLUS ON SE RÉGALE</p>
              <h2>
                La table est meilleure <em>ensemble.</em>
              </h2>
            </div>
            <span className="section-note">
              Vos formules à partager <Users size={20} />
            </span>
          </div>
          <div className="combo-grid">
            {data.combos.map((b, i) => {
              const normal = b.items.reduce(
                (s, item) =>
                  s +
                  (data.products.find((p) => p.id === item.productId)?.price ??
                    0) *
                    item.quantity,
                0,
              );
              return (
                <article key={b.id} className={`combo-card combo-${i}`}>
                  <div className="combo-top">
                    <span>
                      <Users size={16} /> {b.people} personnes
                    </span>
                    <span className="badge">
                      {b.active ? "Disponible" : "À valider"}
                    </span>
                  </div>
                  <div className="combo-title">
                    <h3>
                      {b.name}
                      <span>.</span>
                    </h3>
                    <span className="combo-number">0{i + 1}</span>
                  </div>
                  <p className="combo-intro">
                    {
                      [
                        "La bonne idée à deux.",
                        "Le trio qui met tout le monde d’accord.",
                        "Toute la bande, un seul bon plan.",
                      ][i]
                    }
                  </p>
                  <ul>
                    {b.items.map((item) => (
                      <li key={item.productId}>
                        <Check size={14} />
                        {item.quantity} ×{" "}
                        {
                          data.products.find((p) => p.id === item.productId)
                            ?.name
                        }
                      </li>
                    ))}
                  </ul>
                  <div className="combo-savings">
                    Vous économisez {money(normal - b.price)} DT{" "}
                    <span>au lieu de {money(normal)} DT</span>
                  </div>
                  <div className="combo-bottom">
                    <div>
                      <strong>{money(b.price)}</strong>
                      <span> DT {b.active ? "" : "· proposé"}</span>
                    </div>
                    <button
                      onClick={() => addBundle(b)}
                      disabled={!b.active}
                      className="combo-add"
                      aria-label={`Ajouter ${b.name}`}
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="offer-disclosure">
            Boissons : Boga Cidre 24cl à 3.000 DT incluses dans la composition
            initiale. Formules modifiables par le propriétaire. Aucun cumul avec
            réduction étudiante ou cadeau Club.
          </p>
        </section>
        <section id="le-club" className="club-section">
          <div className="content club-inner">
            <div className="club-copy">
              <p className="eyebrow">
                <Star size={14} /> BIENVENUE DANS LE CLUB
              </p>
              <h2>
                Vos habitudes ont
                <br />
                de belles <em>récompenses.</em>
              </h2>
              <p>
                Votre pizza du vendredi. Le burger entre deux cours.
                <br />
                Chaque repas éligible payé et retiré vous rapproche d’un cadeau.
              </p>
              <div className="club-steps">
                <span>
                  <b>1</b> Un repas éligible = 1 point
                </span>
                <span>
                  <b>8</b> 8 points = 2 identiques pour le prix d’1
                </span>
              </div>
              <button
                className="button ivory"
                onClick={() => setAccountOpen(true)}
              >
                {account.user ? "Voir ma carte Club" : "Je rejoins le Club"}
                <ArrowUpRight size={19} />
              </button>
              <small>
                Compte vérifié requis. Formules sans points par défaut. Articles
                offerts exclus.
              </small>
            </div>
            <div className="club-card-display">
              <div className="club-card">
                <div className="pass-top">
                  <span>ROMANTICA</span>
                  <span>CLUB ✦</span>
                </div>
                <span className="club-card-caption">
                  LES BONNES HABITUDES SE RÉCOMPENSENT.
                </span>
                <div className="demo-stamps">
                  {Array.from({ length: 8 }, (_, i) => (
                    <span key={i}>
                      {i === 7 ? (
                        <Gift size={23} />
                      ) : (
                        <UtensilsCrossed size={20} />
                      )}
                    </span>
                  ))}
                </div>
                <div className="pass-bottom">
                  <div>
                    <strong>8 repas. 1 cadeau.</strong>
                    <small>Deux fois votre favori. Un seul à payer.</small>
                  </div>
                  <ArrowUpRight />
                </div>
              </div>
              <div className="card-scribble">
                Un petit merci, à notre façon. <Heart size={17} />
              </div>
              <span className="club-demo-label">
                Illustration de la carte · solde réel dans votre compte
              </span>
            </div>
          </div>
        </section>
        <section id="etudiants" className="content student-section">
          <div className="student-icon">
            <GraduationCap size={38} />
          </div>
          <div>
            <p className="eyebrow">LA VIE ÉTUDIANTE A MEILLEUR GOÛT ICI</p>
            <h2>Votre pause entre deux cours.</h2>
            <p>
              {studentLive
                ? `${data.settings.studentPercent}% de réduction sur les articles éligibles`
                : "Proposition : 20% de réduction sur pizzas, plats et fast food."}{" "}
              Boissons exclues par défaut. Vérification en caisse et validité
              limitée. Aucun cumul.
            </p>
            <div className="student-examples">
              Burger Classic <s>9.000</s> <strong>7.200 DT</strong>
              <span>·</span> Pizza Margarita <s>10.000</s>{" "}
              <strong>8.000 DT</strong>
              <small>Exemples de la proposition à 20%.</small>
            </div>
          </div>
          <span className="badge">
            {studentLive ? "Activée" : "En attente d’approbation"}
          </span>
        </section>
        <section id="nous-trouver" className="visit-section">
          <div className="content visit-inner">
            <div>
              <p className="eyebrow">ON SE RETROUVE CHEZ ROMANTICA ?</p>
              <h2>
                Votre prochaine pause,
                <br />
                <em>à Mahdia.</em>
              </h2>
              <p>
                <MapPin size={17} />
                {data.settings.address}
              </p>
              <p>
                <Clock size={17} />
                {data.settings.openingHours}
              </p>
              <div className="hero-buttons">
                <a
                  href={data.settings.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="button secondary"
                >
                  Itinéraire <ArrowUpRight size={17} />
                </a>
                {data.settings.whatsapp && (
                  <a
                    className="link-button"
                    href={`https://wa.me/${data.settings.whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Nous contacter
                  </a>
                )}
              </div>
            </div>
            <div className="visit-note">
              <span className="eyebrow">COMMENT ÇA SE PASSE ?</span>
              <div>
                <span>01</span>
                <p>
                  Composez votre pause.
                  <small>
                    Choisissez vos envies et votre heure de retrait.
                  </small>
                </p>
              </div>
              <div>
                <span>02</span>
                <p>
                  L’équipe vous confirme.
                  <small>La demande attend l’acceptation du restaurant.</small>
                </p>
              </div>
              <div>
                <span>03</span>
                <p>
                  Passez, payez, savourez.
                  <small>
                    Paiement au comptoir. Les points suivent le retrait payé.
                  </small>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer>
        <div className="content footer-main">
          <Brand />
          <span>De bons plats. De vrais moments.</span>
          <div>
            <button onClick={() => setFeedback(true)}>
              Un mot pour nous <ArrowUpRight size={14} />
            </button>
            <a href="/conditions">Conditions Club</a>
            <a href="/confidentialite">Confidentialité</a>
            <a href="/staff">Espace équipe</a>
          </div>
        </div>
        <div className="content footer-bottom">
          <span>© {new Date().getFullYear()} Romantica · Mahdia, Tunisie</span>
          <span>Prix en dinars tunisiens, à trois décimales.</span>
          {installPrompt && (
            <button
              onClick={async () => {
                await installPrompt.prompt();
                setInstallPrompt(null);
              }}
            >
              <Download size={14} /> Installer l’application
            </button>
          )}
        </div>
      </footer>
      {count > 0 && !drawer && (
        <button
          className="sticky-cart"
          onClick={() => {
            setDrawer(true);
            setReceipt(null);
          }}
        >
          <span className="cart-count">{count}</span>
          <span>Voir mon panier</span>
          <strong>{money(estimate)} DT</strong>
          <ArrowRight size={19} />
        </button>
      )}
      {toast && (
        <div role="status" className="toast">
          <CheckCircle2 size={19} />
          {toast}
        </div>
      )}
      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          {detail.image && (
            <img
              className="detail-image"
              src={detail.image}
              alt="Suggestion de présentation"
            />
          )}
          <p>{detail.description}</p>
          <p className="detail-price">{money(detail.price)} DT</p>
          {detail.rewardEligible && (
            <span className="badge">
              <Gift size={13} /> Éligible au cadeau Club
            </span>
          )}
          {detail.id === "baguette-farcie" && (
            <label className="form">
              Votre garniture
              <select
                value={option}
                onChange={(e) => setOption(e.target.value)}
              >
                <option>Escalope panée</option>
                <option>Escalope grillée</option>
                <option>Cordon bleu</option>
              </select>
            </label>
          )}
          <p className="muted small">
            Photo d’illustration. Pour les allergènes et les ingrédients à
            confirmer, consultez l’équipe.
          </p>
          <button
            className="button full"
            disabled={!detail.available}
            onClick={() =>
              add(detail, detail.id === "baguette-farcie" ? option : undefined)
            }
          >
            {detail.available ? "Ajouter au panier" : "Indisponible"}
            <Plus size={18} />
          </button>
        </Modal>
      )}
      {accountOpen && (
        <AccountPanel
          onClose={() => setAccountOpen(false)}
          onUser={setAccount}
          onReward={() => {
            setRewardPick(true);
            setFilter("reward");
            setCategory("Tous");
          }}
        />
      )}
      {drawer && (
        <Modal
          title={receipt ? "Demande envoyée" : "Votre prochaine pause"}
          onClose={() => setDrawer(false)}
        >
          {receipt ? (
            <div className="receipt">
              <div className="success-mark">
                <Check size={34} />
              </div>
              <p className="eyebrow">LE RESTAURANT A REÇU VOTRE DEMANDE</p>
              <h3>À très vite, on espère.</h3>
              <p>
                Référence <strong>#{receipt.id.slice(-6).toUpperCase()}</strong>
              </p>
              <p className="notice">
                En attente d’acceptation par l’équipe. Votre commande n’est pas
                encore confirmée.
              </p>
              <strong>{money(receipt.total)} DT · à payer au comptoir</strong>
              <p className="muted">
                {account.user
                  ? "Suivez les changements dans votre compte Club."
                  : "Conservez cette référence et contactez le restaurant pour confirmer le retrait."}
              </p>
              <button className="button full" onClick={() => setDrawer(false)}>
                Continuer la visite
              </button>
            </div>
          ) : !count ? (
            <div className="empty">
              <ShoppingBag size={44} />
              <h3>Une petite faim ?</h3>
              <p>Il y a de bonnes choses qui vous attendent.</p>
              <button
                className="button"
                onClick={() => {
                  setDrawer(false);
                  document
                    .getElementById("la-carte")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Découvrir la carte <ArrowRight size={17} />
              </button>
            </div>
          ) : (
            <>
              <p className="muted small">
                À emporter · Paiement au comptoir · Acceptation par l’équipe
              </p>
              {cart.items.map((item) => {
                const p = data.products.find((p) => p.id === item.productId);
                return (
                  <div className="cart-row" key={item.productId}>
                    <div>
                      <strong>{p?.name ?? "Article à vérifier"}</strong>
                      <small>{item.option ?? p?.category}</small>
                      <span>{money((p?.price ?? 0) * item.quantity)} DT</span>
                    </div>
                    <div className="quantity">
                      <button
                        aria-label={`Retirer un ${p?.name}`}
                        onClick={() =>
                          setCart((c) => ({
                            ...c,
                            items:
                              c.mode === "reward"
                                ? []
                                : c.items.flatMap((i) =>
                                    i.productId === item.productId
                                      ? i.quantity > 1
                                        ? [{ ...i, quantity: i.quantity - 1 }]
                                        : []
                                      : [i],
                                  ),
                            mode: c.mode === "reward" ? "standard" : c.mode,
                          }))
                        }
                      >
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        disabled={cart.mode === "reward"}
                        aria-label={`Ajouter un ${p?.name}`}
                        onClick={() => p && add(p, item.option)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {cart.bundles.map((entry) => (
                <div className="cart-row" key={entry.id}>
                  <div>
                    <strong>
                      {entry.quantity} ×{" "}
                      {data.combos.find((b) => b.id === entry.id)?.name}
                    </strong>
                    <small>Formule à partager</small>
                  </div>
                  <button
                    className="icon-btn"
                    aria-label="Retirer cette formule"
                    onClick={() =>
                      setCart((c) => ({
                        ...c,
                        bundles: c.bundles.filter((b) => b.id !== entry.id),
                        mode: c.bundles.length === 1 ? "standard" : c.mode,
                      }))
                    }
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {cart.mode === "reward" ? (
                <p className="notice">
                  <Gift size={18} /> Cadeau Club · 8 points réservés à la
                  demande, débités au retrait payé.
                </p>
              ) : (
                !cart.bundles.length && (
                  <label className="check-label student-cart">
                    <input
                      type="checkbox"
                      checked={cart.mode === "student"}
                      disabled={!studentLive || !studentVerified}
                      onChange={(e) =>
                        setCart((c) => ({
                          ...c,
                          mode: e.target.checked ? "student" : "standard",
                        }))
                      }
                    />
                    <span>
                      Utiliser mon offre étudiante
                      <small>
                        {!studentLive
                          ? "Offre non activée par le restaurant."
                          : !studentVerified
                            ? "Statut étudiant à vérifier en caisse."
                            : "Statut vérifié. Réduction sur les articles éligibles."}
                      </small>
                    </span>
                  </label>
                )
              )}
              <div className="cart-totals">
                <p>
                  Sous-total <span>{money(subtotal)} DT</span>
                </p>
                {subtotal !== estimate && (
                  <p>
                    Avantage <span>−{money(subtotal - estimate)} DT</span>
                  </p>
                )}
                <p>
                  <strong>Total estimé</strong>
                  <strong>{money(estimate)} DT</strong>
                </p>
                <small>
                  Le prix définitif est calculé par le serveur à l’envoi.
                </small>
              </div>
              {!data.online && (
                <p className="error">
                  Le service de commande est indisponible.
                </p>
              )}
              {!data.settings.orderingEnabled && (
                <p className="notice">
                  Les commandes en ligne ne sont pas ouvertes actuellement.
                </p>
              )}
              <form className="form" onSubmit={checkout}>
                <label>
                  Votre nom
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={80}
                    defaultValue={account.user?.name ?? ""}
                    autoComplete="name"
                  />
                </label>
                <label>
                  Téléphone
                  <input
                    name="phone"
                    type="tel"
                    required
                    pattern="\+?[0-9\s]{8,16}"
                    autoComplete="tel"
                    placeholder="Votre numéro de contact"
                  />
                </label>
                <label>
                  Heure de retrait souhaitée{" "}
                  <span className="muted">(facultatif)</span>
                  <input name="time" type="datetime-local" />
                  <small>
                    Sous réserve d’acceptation. Entre 5 minutes et 24 heures.
                  </small>
                </label>
                <label>
                  Une précision ?
                  <textarea
                    name="note"
                    maxLength={500}
                    placeholder="Informations pour l’équipe…"
                  />
                </label>
                {error && (
                  <p role="alert" className="error">
                    {error}
                  </p>
                )}
                <button
                  className="button full"
                  disabled={
                    busy || !data.online || !data.settings.orderingEnabled
                  }
                >
                  {busy ? (
                    <LoaderCircle className="spin" />
                  ) : (
                    "Envoyer ma demande"
                  )}
                  <ArrowRight size={18} />
                </button>
                <p className="muted small">
                  Vos coordonnées sont utilisées pour traiter votre demande.
                  Aucun paiement en ligne. Aucun point avant paiement et retrait
                  confirmés.
                </p>
              </form>
              <button
                className="text-button"
                onClick={() =>
                  setCart({ items: [], bundles: [], mode: "standard" })
                }
              >
                Vider le panier
              </button>
            </>
          )}
        </Modal>
      )}
      {feedback && (
        <Modal title="Un mot pour nous" onClose={() => setFeedback(false)}>
          <p>Votre retour aide l’équipe à faire mieux. Il reste privé.</p>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              const message = new FormData(e.currentTarget).get("message");
              try {
                await api("feedback", "POST", { message });
                setFeedback(false);
                setToast("Merci ! Votre retour a été transmis à l’équipe.");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <label>
              Votre message
              <textarea
                name="message"
                minLength={5}
                maxLength={1000}
                required
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="button">
              Envoyer mon retour <ArrowRight size={16} />
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function ArrowDownRight() {
  return <ArrowUpRight size={25} style={{ transform: "rotate(90deg)" }} />;
}
