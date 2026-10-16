"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChefHat,
  UtensilsCrossed,
  Users,
  Settings,
  ChartNoAxesCombined,
  QrCode,
  ScrollText,
  ArrowUpRight,
  RefreshCw,
  Plus,
  LogOut,
} from "lucide-react";
import {
  AccountPanel,
  Brand,
  Modal,
  api,
  statusLabels,
  type Account,
  type Catalog,
} from "./storefront";
import { money, type Bundle, type MenuProduct } from "@/lib/menu";
import type { PriceLine } from "@/lib/pricing";
type StaffOrder = {
  id: string;
  userId: string | null;
  customerName: string;
  phone: string;
  status: string;
  createdAt: string;
  pickupAt: string | null;
  note: string;
  lines: PriceLine[];
  total: number;
  subtotal: number;
  discount: number;
  cost: number | null;
  mode: string;
  receipt: string | null;
  campaignId: string | null;
  eligiblePoints: number;
};
type Customer = {
  id: string;
  name: string;
  email: string;
  role: string;
  verified: boolean;
  points: number;
  studentUntil: string | null;
};
type Campaign = {
  id: string;
  name: string;
  active: boolean;
  spend: number | null;
};
type StaffData = Partial<Catalog> & {
  user: NonNullable<Account["user"]>;
  orders: StaffOrder[];
  users?: Customer[];
  allOrders?: StaffOrder[];
  feedback?: { id: string; message: string; createdAt: string }[];
  campaigns?: Campaign[];
  audit?: {
    id: string;
    action: string;
    actorId: string;
    target: string;
    details: unknown;
    createdAt: string;
  }[];
};
type SettingsForm = Catalog["settings"] & {
  minMarginPercent: number;
  overrideReason?: string;
};
const tabs = [
  ["queue", "Commandes", ChefHat],
  ["menu", "La carte", UtensilsCrossed],
  ["customers", "Clients & équipe", Users],
  ["offers", "Offres & réglages", Settings],
  ["analytics", "Résultats", ChartNoAxesCombined],
  ["growth", "Campagnes QR", QrCode],
  ["audit", "Journal", ScrollText],
] as const;
const number = (f: FormData, key: string) =>
  Math.round(Number(f.get(key)) * 1000);
export default function Staff() {
  const [data, setData] = useState<StaffData | null>(null);
  const [account, setAccount] = useState<Account>({ user: null });
  const [login, setLogin] = useState(false);
  const [tab, setTab] = useState("queue");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [product, setProduct] = useState<MenuProduct | null>(null);
  const [combo, setCombo] = useState<Bundle | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [collect, setCollect] = useState<StaffOrder | null>(null);
  const [query, setQuery] = useState("");
  const [settings, setSettings] = useState<SettingsForm | null>(null);
  const [adjustmentKey, setAdjustmentKey] = useState("");
  const refresh = useCallback(async () => {
    try {
      const result = await api("staff");
      setData(result);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    api("me")
      .then((a) => {
        setAccount(a);
        if (a.user && a.user.role !== "CUSTOMER") refresh();
      })
      .catch((e) => setError(e.message));
  }, [refresh]);
  useEffect(() => {
    if (!data) return;
    const timer = setInterval(() => {
      refresh();
    }, 15000);
    return () => clearInterval(timer);
  }, [data, refresh]);
  const updateAccount = useCallback(
    (a: Account) => {
      setAccount(a);
      if (a.user && a.user.role !== "CUSTOMER") {
        refresh();
        setLogin(false);
      }
    },
    [refresh],
  );
  async function save(path: string, body: unknown, close?: () => void) {
    setBusy(true);
    setError("");
    try {
      await api(path, "PATCH", body);
      await refresh();
      setNotice("Modification enregistrée et journalisée.");
      close?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const owner = data?.user.role === "OWNER";
  const cashier = owner || data?.user.role === "CASHIER";
  const paid = data?.allOrders?.filter((o) => o.status === "COLLECTED") ?? [];
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const knownCosts = paid.filter((o) => o.cost !== null);
  const knownRevenue = knownCosts.reduce((s, o) => s + o.total, 0);
  const knownCost = knownCosts.reduce((s, o) => s + (o.cost ?? 0), 0);
  const settingsData = data?.settings as SettingsForm | undefined;
  if (!data)
    return (
      <div className="staff-login">
        <div>
          <Brand />
          <p className="eyebrow section-gap">ESPACE ÉQUIPE</p>
          <h1>
            Aux petits soins,
            <br />
            <em>en coulisses.</em>
          </h1>
          <p className="muted">
            Commandes, carte et fidélité : votre restaurant au même endroit.
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {account.user?.role === "CUSTOMER" ? (
            <p className="notice">
              Votre compte client n’a pas de permission équipe. Demandez au
              propriétaire de vous attribuer un rôle.
            </p>
          ) : (
            <button className="button full" onClick={() => setLogin(true)}>
              Connexion équipe <ArrowUpRight size={17} />
            </button>
          )}
          <Link className="text-button" href="/">
            Retour au restaurant
          </Link>
          {login && (
            <AccountPanel
              onClose={() => setLogin(false)}
              onUser={updateAccount}
            />
          )}
        </div>
      </div>
    );
  return (
    <div className="staff-shell">
      <aside className="staff-sidebar">
        <Brand />
        <div className="eyebrow">LES COULISSES</div>
        <nav>
          {tabs
            .filter(
              ([id]) =>
                owner || id === "queue" || (id === "customers" && cashier),
            )
            .map(([id, label, Icon]) => (
              <button
                key={id}
                className={tab === id ? "active" : ""}
                onClick={() => {
                  setTab(id);
                  setNotice("");
                }}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
        </nav>
        <Link href="/" className="text-button">
          Voir le restaurant <ArrowUpRight size={14} />
        </Link>
        <button
          className="text-button"
          onClick={async () => {
            await api("logout", "POST");
            setData(null);
            setAccount({ user: null });
          }}
        >
          <LogOut size={14} /> Déconnexion
        </button>
        <small>
          {data.user.name}
          <br />
          {data.user.role} · Actualisation toutes les 15 s
        </small>
      </aside>
      <main className="staff-main">
        <header className="staff-header">
          <div>
            <h1>{tabs.find((t) => t[0] === tab)?.[1]}</h1>
            <p>
              Romantica, Mahdia ·{" "}
              {new Date().toLocaleDateString("fr-TN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <button className="text-button" onClick={refresh}>
            <RefreshCw size={15} /> Actualiser
          </button>
        </header>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        {tab === "queue" && (
          <>
            <div className="stats">
              <div className="stat">
                <strong>
                  {data.orders.filter((o) => o.status === "REQUESTED").length}
                </strong>
                <small>Demandes à accepter</small>
              </div>
              <div className="stat">
                <strong>
                  {data.orders.filter((o) => o.status === "PREPARING").length}
                </strong>
                <small>En cuisine</small>
              </div>
              <div className="stat">
                <strong>
                  {data.orders.filter((o) => o.status === "READY").length}
                </strong>
                <small>Prêtes à retirer</small>
              </div>
              <div className="stat">
                <strong>{data.orders.length}</strong>
                <small>Commandes en cours</small>
              </div>
            </div>
            <div className="order-board">
              {["REQUESTED", "ACCEPTED", "PREPARING", "READY"].map((status) => (
                <section className="order-column" key={status}>
                  <h3>
                    {statusLabels[status]}{" "}
                    <span>
                      {data.orders.filter((o) => o.status === status).length}
                    </span>
                  </h3>
                  {data.orders
                    .filter((o) => o.status === status)
                    .map((o) => (
                      <article className="order-tile" key={o.id}>
                        <h4>
                          #{o.id.slice(-6).toUpperCase()} · {o.customerName}
                        </h4>
                        <small>
                          {new Date(o.createdAt).toLocaleTimeString("fr-TN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {o.pickupAt &&
                            ` · Retrait souhaité ${new Date(o.pickupAt).toLocaleString("fr-TN")}`}
                        </small>
                        {cashier && <p>{o.phone}</p>}
                        <ul>
                          {o.lines.map((l, i) => (
                            <li key={i}>
                              {l.quantity} × {l.name}
                              {l.option && ` · ${l.option}`}
                              {l.bundleId && ` (${l.bundleId})`}
                            </li>
                          ))}
                        </ul>
                        {o.note && <p className="notice">{o.note}</p>}
                        <strong>{money(o.total)} DT</strong>
                        <small>{o.mode} · Non payé</small>
                        <button
                          className="button full"
                          disabled={busy || (!cashier && status === "READY")}
                          onClick={() =>
                            status === "READY"
                              ? setCollect(o)
                              : save("staff/order", {
                                  id: o.id,
                                  status: {
                                    REQUESTED: "ACCEPTED",
                                    ACCEPTED: "PREPARING",
                                    PREPARING: "READY",
                                  }[status],
                                })
                          }
                        >
                          {
                            {
                              REQUESTED: "Accepter",
                              ACCEPTED: "Préparer",
                              PREPARING: "Marquer prête",
                              READY: "Encaisser & remettre",
                            }[status]
                          }
                        </button>
                        {cashier && (
                          <button
                            className="text-button"
                            disabled={busy}
                            onClick={() => {
                              if (
                                confirm(
                                  "Annuler cette commande et libérer les points réservés ?",
                                )
                              )
                                save("staff/order", {
                                  id: o.id,
                                  status: "CANCELED",
                                });
                            }}
                          >
                            Annuler la demande
                          </button>
                        )}
                      </article>
                    ))}
                  {!data.orders.some((o) => o.status === status) && (
                    <p className="muted small">Aucune commande ici.</p>
                  )}
                </section>
              ))}
            </div>
            <p className="privacy-note">
              Encaisser & remettre confirme un paiement réel et le retrait. La
              caisse doit vérifier le reçu avant cette action.
            </p>
          </>
        )}
        {tab === "menu" && (
          <>
            <p className="muted">
              Les coûts sont inconnus tant que vous ne les saisissez pas. Chaque
              prix est conservé en millimes.
            </p>
            <label className="search">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un article…"
              />
            </label>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Article</th>
                    <th>Prix</th>
                    <th>Coût variable</th>
                    <th>Marge standard</th>
                    <th>Disponibilité</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.products
                    ?.filter((p) =>
                      p.name.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((p) => (
                      <tr key={p.id}>
                        <td>
                          {p.name}
                          <small>{p.category}</small>
                        </td>
                        <td>{money(p.price)} DT</td>
                        <td>
                          {p.cost === null
                            ? "À renseigner"
                            : `${money(p.cost)} DT`}
                        </td>
                        <td>
                          {p.cost === null
                            ? "Inconnue"
                            : `${money(p.price - p.cost)} DT (${(((p.price - p.cost) / p.price) * 100).toFixed(1)}%)`}
                        </td>
                        <td>{p.available ? "Disponible" : "Indisponible"}</td>
                        <td>
                          <button onClick={() => setProduct(p)}>
                            Modifier
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {tab === "customers" && (
          <>
            <p className="muted">
              Vérifiez l’identité du compte et la carte étudiante en personne.
              Ne conservez aucune copie de pièce d’identité.
            </p>
            <label className="search">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom ou e-mail…"
              />
            </label>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Compte</th>
                    <th>Étudiant jusqu’au</th>
                    <th>Points</th>
                    <th>Rôle</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.users
                    ?.filter((u) =>
                      `${u.name} ${u.email}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .map((u) => (
                      <tr key={u.id}>
                        <td>
                          {u.name}
                          <small>{u.email}</small>
                        </td>
                        <td>{u.verified ? "Vérifié" : "À vérifier"}</td>
                        <td>
                          {u.studentUntil
                            ? new Date(u.studentUntil).toLocaleDateString(
                                "fr-TN",
                              )
                            : "Non vérifié"}
                        </td>
                        <td>{u.points}</td>
                        <td>{u.role}</td>
                        <td>
                          <button
                            onClick={() => {
                              setCustomer(u);
                              setAdjustmentKey(crypto.randomUUID());
                            }}
                          >
                            Gérer
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {tab === "offers" && (
          <>
            <div className="panel">
              <h3>Configuration du restaurant</h3>
              <p>
                Commandes :{" "}
                <strong>
                  {data.settings?.orderingEnabled ? "ouvertes" : "fermées"}
                </strong>{" "}
                · Offre étudiante :{" "}
                <strong>
                  {data.settings?.studentActive ? "activée" : "non activée"}
                </strong>{" "}
                · Réduction proposée : {data.settings?.studentPercent}%
              </p>
              <p>
                Seuil de marge : {settingsData?.minMarginPercent}% · Points sur
                formules :{" "}
                {data.settings?.comboPoints ? "activés" : "désactivés"}
              </p>
              <p>
                {data.settings?.openingHours}
                <br />
                {data.settings?.address}
              </p>
              <button
                className="button secondary"
                onClick={() => setSettings(settingsData!)}
              >
                Configurer & approuver
              </button>
            </div>
            <h2>Formules à partager</h2>
            <div className="combo-grid">
              {data.combos?.map((b) => {
                const normal = b.items.reduce(
                  (s, i) =>
                    s +
                    (data.products?.find((p) => p.id === i.productId)?.price ??
                      0) *
                      i.quantity,
                  0,
                );
                const known = b.items.every(
                  (i) =>
                    data.products?.find((p) => p.id === i.productId)?.cost !==
                    null,
                );
                const cost = b.items.reduce(
                  (s, i) =>
                    s +
                    (data.products?.find((p) => p.id === i.productId)?.cost ??
                      0) *
                      i.quantity,
                  0,
                );
                return (
                  <article className="combo-card" key={b.id}>
                    <span className="badge">
                      {b.active ? "Active" : "Proposition inactive"}
                    </span>
                    <h3 className="section-gap">{b.name}</h3>
                    <p>
                      {b.items
                        .map(
                          (i) =>
                            `${i.quantity} × ${data.products?.find((p) => p.id === i.productId)?.name}`,
                        )
                        .join(" + ")}
                    </p>
                    <p>
                      {money(b.price)} DT · Normal {money(normal)} DT
                      <br />
                      Économie {money(normal - b.price)} DT
                    </p>
                    <p>
                      Marge :{" "}
                      {known
                        ? `${money(b.price - cost)} DT (${(((b.price - cost) / b.price) * 100).toFixed(1)}%)`
                        : "inconnue (coûts manquants)"}
                    </p>
                    <button
                      className="button secondary"
                      onClick={() => setCombo(b)}
                    >
                      Modifier / approuver
                    </button>
                  </article>
                );
              })}
            </div>
            <div className="panel">
              <h3>Rentabilité par article</h3>
              <p>
                La remise étudiante suit la configuration. Le cadeau correspond
                au coût de deux unités pour le prix d’une seule.
              </p>
              <div className="data-table-wrap">
                <table className="data-table metric-table">
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th>Coût unitaire</th>
                      <th>Marge standard</th>
                      <th>Marge étudiant</th>
                      <th>Marge paire cadeau</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.products?.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>{p.cost === null ? "Inconnu" : money(p.cost)}</td>
                        <td>
                          {p.cost === null
                            ? "Inconnue"
                            : money(p.price - p.cost)}
                        </td>
                        <td>
                          {!p.studentEligible
                            ? "Non éligible"
                            : p.cost === null
                              ? "Inconnue"
                              : money(
                                  Math.round(
                                    (p.price *
                                      (100 -
                                        (data.settings?.studentPercent ??
                                          20))) /
                                      100,
                                  ) - p.cost,
                                )}
                        </td>
                        <td>
                          {!p.rewardEligible
                            ? "Non éligible"
                            : p.cost === null
                              ? "Inconnue"
                              : money(p.price - p.cost * 2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        {tab === "analytics" && (
          <>
            <p className="muted">
              Calculé sur les commandes retirées et payées, hors commandes
              remboursées. Historique chargé : les 2 000 dernières commandes.
              Coûts figés à la commande.
            </p>
            <div className="stats">
              <div className="stat">
                <strong>{money(revenue)}</strong>
                <small>DT · Chiffre d’affaires</small>
              </div>
              <div className="stat">
                <strong>{paid.length}</strong>
                <small>Commandes payées</small>
              </div>
              <div className="stat">
                <strong>
                  {money(paid.length ? Math.round(revenue / paid.length) : 0)}
                </strong>
                <small>DT · Panier moyen</small>
              </div>
              <div className="stat">
                <strong>
                  {money(paid.reduce((s, o) => s + o.discount, 0))}
                </strong>
                <small>DT · Avantages accordés</small>
              </div>
            </div>
            <div className="panel">
              <h3>Marge de contribution</h3>
              <p>
                {knownCosts.length === paid.length
                  ? `Marge : ${money(knownRevenue - knownCost)} DT`
                  : `Marge calculable sur ${knownCosts.length}/${paid.length} commandes : ${money(knownRevenue - knownCost)} DT. Total restaurant inconnu : des coûts manquent.`}
              </p>
              <p>
                Clients ayant au moins deux commandes payées :{" "}
                {
                  Object.values(
                    paid
                      .filter((o) => o.userId)
                      .reduce<
                        Record<string, number>
                      >((a, o) => ({ ...a, [o.userId!]: (a[o.userId!] ?? 0) + 1 }), {}),
                  ).filter((n) => n >= 2).length
                }
              </p>
              <p>
                Coût des unités offertes :{" "}
                {paid
                  .filter((o) => o.mode === "reward")
                  .some((o) => o.cost === null)
                  ? "inconnu (coûts manquants)"
                  : `${money(paid.filter((o) => o.mode === "reward").reduce((s, o) => s + (o.cost ?? 0) / 2, 0))} DT`}
              </p>
            </div>
            <div className="panel">
              <h3>Articles les plus commandés</h3>
              {Object.entries(
                paid
                  .flatMap((o) => o.lines)
                  .reduce<
                    Record<string, number>
                  >((a, l) => ({ ...a, [l.name]: (a[l.name] ?? 0) + l.quantity }), {}),
              )
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([name, n]) => (
                  <div className="history-row" key={name}>
                    <span>{name}</span>
                    <strong>{n} unités</strong>
                  </div>
                ))}
              {!paid.length && <p>Aucune vente réelle enregistrée.</p>}
            </div>
            <div className="panel">
              <h3>Historique & remboursements</h3>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Commande</th>
                      <th>État / reçu</th>
                      <th>Total</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.allOrders?.slice(0, 100).map((o) => (
                      <tr key={o.id}>
                        <td>
                          #{o.id.slice(-6).toUpperCase()}
                          <small>
                            {o.customerName} ·{" "}
                            {new Date(o.createdAt).toLocaleDateString("fr-TN")}
                          </small>
                        </td>
                        <td>
                          {statusLabels[o.status]}
                          <small>{o.receipt}</small>
                        </td>
                        <td>{money(o.total)} DT</td>
                        <td>
                          {o.status === "COLLECTED" && (
                            <button
                              disabled={busy}
                              onClick={() => {
                                if (
                                  confirm(
                                    "Confirmez que le remboursement intégral a été effectué. Cette action inverse les points gagnés ou restitue les points du cadeau.",
                                  )
                                )
                                  save("staff/order", {
                                    id: o.id,
                                    status: "REFUNDED",
                                  });
                              }}
                            >
                              Confirmer remboursement
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        {tab === "growth" && (
          <>
            <p className="muted">
              Les liens attribuent les commandes à une campagne. Les QR restent
              inactifs commercialement tant que vous n’activez pas la campagne.
              Le consentement marketing se gère dans chaque compte.
            </p>
            <button
              className="button"
              onClick={() =>
                setCampaign({ id: "", name: "", active: false, spend: null })
              }
            >
              <Plus size={17} /> Nouvelle campagne
            </button>
            {data.campaigns?.map((c) => {
              const orders = paid.filter((o) => o.campaignId === c.id);
              const rev = orders.reduce((s, o) => s + o.total, 0);
              const costKnown = orders.every((o) => o.cost !== null);
              const margin = orders.reduce(
                (s, o) => s + o.total - (o.cost ?? 0),
                0,
              );
              return (
                <div className="panel campaign-card" key={c.id}>
                  <div>
                    <h3>{c.name}</h3>
                    <span className="badge">
                      {c.active ? "Active" : "Inactive"}
                    </span>
                    <p>
                      {orders.length} commandes payées · {money(rev)} DT de
                      ventes
                      <br />
                      Dépenses :{" "}
                      {c.spend === null
                        ? "non renseignées"
                        : `${money(c.spend)} DT`}
                      <br />
                      ROI :{" "}
                      {c.spend && costKnown
                        ? `${(((margin - c.spend) / c.spend) * 100).toFixed(1)}%`
                        : "non calculable sans coûts et dépenses positives"}
                    </p>
                    <a
                      className="text-button"
                      href={`/?campaign=${c.id}`}
                      target="_blank"
                    >
                      Ouvrir le lien de campagne <ArrowUpRight size={13} />
                    </a>
                    <button
                      className="button secondary"
                      onClick={() => setCampaign(c)}
                    >
                      Configurer
                    </button>
                  </div>
                  <CampaignQr id={c.id} />
                </div>
              );
            })}
            <div className="panel">
              <h3>Retours privés des clients</h3>
              {data.feedback?.length ? (
                data.feedback.map((f) => (
                  <div className="audit-item" key={f.id}>
                    <p>{f.message}</p>
                    <small>
                      {new Date(f.createdAt).toLocaleString("fr-TN")}
                    </small>
                  </div>
                ))
              ) : (
                <p>Aucun retour pour le moment.</p>
              )}
            </div>
          </>
        )}
        {tab === "audit" && (
          <>
            <p className="muted">
              Les 100 derniers événements. Tous les ajustements manuels et
              changements de configuration sont conservés en base.
            </p>
            <div className="panel">
              {data.audit?.map((a) => (
                <details className="audit-item" key={a.id}>
                  <summary>
                    {a.action} · {a.target.slice(-12)}
                    <small>
                      {new Date(a.createdAt).toLocaleString("fr-TN")} · Acteur{" "}
                      {a.actorId}
                    </small>
                  </summary>
                  <pre style={{ whiteSpace: "pre-wrap", fontSize: 10 }}>
                    {JSON.stringify(a.details, null, 2)}
                  </pre>
                </details>
              ))}
            </div>
          </>
        )}
      </main>
      {collect && (
        <Modal title="Paiement & retrait" onClose={() => setCollect(null)}>
          <p>
            Commande <strong>#{collect.id.slice(-6).toUpperCase()}</strong> ·{" "}
            {money(collect.total)} DT
          </p>
          <p className="notice">
            Vérifiez le paiement réel, le reçu et la remise de la commande.
            Cette validation attribue les points ou consomme le cadeau une seule
            fois.
          </p>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              save(
                "staff/order",
                {
                  id: collect.id,
                  status: "COLLECTED",
                  receipt: new FormData(e.currentTarget).get("receipt"),
                },
                () => setCollect(null),
              );
            }}
          >
            <label>
              Référence unique du reçu
              <input name="receipt" required minLength={3} maxLength={100} />
            </label>
            <label className="check-label">
              <input type="checkbox" required /> Paiement reçu et commande
              remise au client.
            </label>
            {error && <p className="error">{error}</p>}
            <button className="button" disabled={busy}>
              Confirmer le paiement & retrait
            </button>
          </form>
        </Modal>
      )}
      {product && (
        <Modal title="Modifier l’article" onClose={() => setProduct(null)}>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              save(
                "owner/product",
                {
                  id: product.id,
                  name: f.get("name"),
                  description: f.get("description"),
                  price: number(f, "price"),
                  cost: f.get("cost") === "" ? null : number(f, "cost"),
                  image: f.get("image") || null,
                  available: f.get("available") === "on",
                  studentEligible: f.get("student") === "on",
                  loyaltyEligible: f.get("loyalty") === "on",
                  rewardEligible: f.get("reward") === "on",
                  overrideReason: f.get("overrideReason"),
                },
                () => setProduct(null),
              );
            }}
          >
            <label>
              Nom
              <input
                name="name"
                defaultValue={product.name}
                required
                maxLength={120}
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                defaultValue={product.description}
                maxLength={500}
              />
            </label>
            <div className="form-grid">
              <label>
                Prix (DT)
                <input
                  name="price"
                  type="number"
                  step="0.001"
                  min="0.500"
                  defaultValue={money(product.price)}
                  required
                />
              </label>
              <label>
                Coût variable (DT)
                <input
                  name="cost"
                  type="number"
                  step="0.001"
                  min="0"
                  defaultValue={
                    product.cost === null ? "" : money(product.cost)
                  }
                />
              </label>
            </div>
            <label>
              Photo (URL https ou /images/…)
              <input name="image" defaultValue={product.image ?? ""} />
            </label>
            <label className="check-label">
              <input
                name="available"
                type="checkbox"
                defaultChecked={product.available}
              />{" "}
              Disponible
            </label>
            <label className="check-label">
              <input
                name="student"
                type="checkbox"
                defaultChecked={product.studentEligible}
              />{" "}
              Éligible à la remise étudiante
            </label>
            <label className="check-label">
              <input
                name="loyalty"
                type="checkbox"
                defaultChecked={product.loyaltyEligible}
              />{" "}
              Rapporte un point par unité payée
            </label>
            <label className="check-label">
              <input
                name="reward"
                type="checkbox"
                defaultChecked={product.rewardEligible}
              />{" "}
              Éligible au cadeau (coût de deux unités)
            </label>
            <label>
              Dérogation de rentabilité (si nécessaire)
              <textarea
                name="overrideReason"
                placeholder="Motif explicite si coût inconnu ou marge sous le seuil…"
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button disabled={busy} className="button">
              Enregistrer l’article
            </button>
          </form>
        </Modal>
      )}
      {combo && (
        <Modal
          title={`Configurer ${combo.name}`}
          onClose={() => setCombo(null)}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                save(
                  "owner/combo",
                  {
                    id: combo.id,
                    name: f.get("name"),
                    price: number(f, "price"),
                    active: f.get("active") === "on",
                    items: JSON.parse(String(f.get("items"))),
                    overrideReason: f.get("overrideReason"),
                  },
                  () => setCombo(null),
                );
              } catch {
                setError("Composition JSON invalide.");
              }
            }}
          >
            <label>
              Nom
              <input name="name" defaultValue={combo.name} required />
            </label>
            <label>
              Prix de formule (DT)
              <input
                name="price"
                type="number"
                min="0.001"
                step="0.001"
                defaultValue={money(combo.price)}
                required
              />
            </label>
            <label>
              Composition (identifiants et quantités)
              <textarea
                name="items"
                style={{
                  minHeight: 180,
                  fontFamily: "monospace",
                  fontSize: 11,
                }}
                defaultValue={JSON.stringify(combo.items, null, 2)}
                required
              />
            </label>
            <details>
              <summary>Identifiants des articles</summary>
              {data.products?.map((p) => (
                <p key={p.id}>
                  {p.id} — {p.name}
                </p>
              ))}
            </details>
            <label className="check-label">
              <input
                type="checkbox"
                name="active"
                defaultChecked={combo.active}
              />{" "}
              J’approuve et active cette formule.
            </label>
            <label>
              Motif de dérogation si coûts inconnus ou marge insuffisante
              <textarea name="overrideReason" />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="button" disabled={busy}>
              Enregistrer la formule
            </button>
          </form>
        </Modal>
      )}
      {settings && (
        <Modal
          title="Réglages & approbations"
          onClose={() => setSettings(null)}
        >
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              save(
                "owner/settings",
                {
                  studentActive: f.get("studentActive") === "on",
                  studentPercent: Number(f.get("studentPercent")),
                  studentStartsAt: f.get("start")
                    ? new Date(String(f.get("start"))).toISOString()
                    : null,
                  studentEndsAt: f.get("end")
                    ? new Date(String(f.get("end"))).toISOString()
                    : null,
                  comboPoints: f.get("comboPoints") === "on",
                  minMarginPercent: Number(f.get("minMarginPercent")),
                  orderingEnabled: f.get("orderingEnabled") === "on",
                  openingHours: f.get("openingHours"),
                  whatsapp: f.get("whatsapp"),
                  address: f.get("address"),
                  mapsUrl: f.get("mapsUrl"),
                  overrideReason: f.get("overrideReason"),
                },
                () => setSettings(null),
              );
            }}
          >
            <label className="check-label">
              <input
                name="orderingEnabled"
                type="checkbox"
                defaultChecked={settings.orderingEnabled}
              />{" "}
              Ouvrir les demandes de commande
            </label>
            <label>
              Horaires (affichage client)
              <textarea
                name="openingHours"
                defaultValue={settings.openingHours}
                required
              />
            </label>
            <label>
              Adresse
              <input name="address" defaultValue={settings.address} required />
            </label>
            <label>
              Lien Google Maps
              <input
                name="mapsUrl"
                type="url"
                defaultValue={settings.mapsUrl}
                required
              />
            </label>
            <label>
              WhatsApp (chiffres avec indicatif pays)
              <input
                name="whatsapp"
                defaultValue={settings.whatsapp}
                placeholder="216…"
              />
            </label>
            <label className="check-label">
              <input
                name="studentActive"
                type="checkbox"
                defaultChecked={settings.studentActive}
              />{" "}
              J’approuve et active l’offre étudiante
            </label>
            <label>
              Réduction étudiante (%)
              <input
                name="studentPercent"
                type="number"
                min={1}
                max={50}
                defaultValue={settings.studentPercent}
                required
              />
            </label>
            <div className="form-grid">
              <label>
                Début (facultatif)
                <input
                  name="start"
                  type="datetime-local"
                  defaultValue={localDate(settings.studentStartsAt)}
                />
              </label>
              <label>
                Fin (facultatif)
                <input
                  name="end"
                  type="datetime-local"
                  defaultValue={localDate(settings.studentEndsAt)}
                />
              </label>
            </div>
            <label>
              Seuil de marge de contribution (%)
              <input
                name="minMarginPercent"
                type="number"
                min={0}
                max={90}
                defaultValue={settings.minMarginPercent}
                required
              />
            </label>
            <label className="check-label">
              <input
                name="comboPoints"
                type="checkbox"
                defaultChecked={settings.comboPoints}
              />{" "}
              Après revue de rentabilité, attribuer des points aux repas des
              formules
            </label>
            <label>
              Dérogation de rentabilité
              <textarea
                name="overrideReason"
                placeholder="Motif explicite de l’exception si nécessaire…"
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="button" disabled={busy}>
              Enregistrer les réglages
            </button>
          </form>
        </Modal>
      )}
      {customer && (
        <Modal title={customer.name} onClose={() => setCustomer(null)}>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              save(
                "staff/customer",
                {
                  id: customer.id,
                  verified: f.get("verified") === "on",
                  studentUntil: f.get("studentUntil")
                    ? new Date(String(f.get("studentUntil"))).toISOString()
                    : null,
                  reason: f.get("reason"),
                },
                () => setCustomer(null),
              );
            }}
          >
            <p className="muted">
              {customer.email} · {customer.points} points
            </p>
            <label className="check-label">
              <input
                name="verified"
                type="checkbox"
                defaultChecked={customer.verified}
              />{" "}
              Compte vérifié en personne
            </label>
            <label>
              Carte étudiante vérifiée, valable jusqu’au
              <input
                name="studentUntil"
                type="datetime-local"
                defaultValue={localDate(customer.studentUntil)}
              />
            </label>
            <label>
              Justification de la vérification
              <textarea
                name="reason"
                required
                minLength={5}
                maxLength={300}
                placeholder="Ex. Carte étudiante présentée en caisse"
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="button" disabled={busy}>
              Enregistrer la vérification
            </button>
          </form>
          {owner && (
            <>
              <details className="section-gap">
                <summary>Permissions du personnel</summary>
                <label>
                  Rôle
                  <select
                    className="field"
                    value={customer.role}
                    disabled={customer.id === data.user.id || busy}
                    onChange={(e) => {
                      const role = e.target.value;
                      if (
                        confirm(
                          `Attribuer le rôle ${role} à ${customer.name} ? Les sessions existantes seront révoquées.`,
                        )
                      )
                        save("owner/staff", { id: customer.id, role }, () =>
                          setCustomer(null),
                        );
                    }}
                  >
                    {["CUSTOMER", "KITCHEN", "CASHIER", "OWNER"].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
              </details>
              <details>
                <summary>Ajustement manuel des points</summary>
                <form
                  className="form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    setBusy(true);
                    try {
                      await api("owner/points", "POST", {
                        id: customer.id,
                        delta: Number(f.get("delta")),
                        reason: f.get("reason"),
                        requestId: adjustmentKey,
                      });
                      await refresh();
                      setCustomer(null);
                      setNotice("Ajustement de points journalisé.");
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <label>
                    Variation (−100 à +100)
                    <input
                      name="delta"
                      type="number"
                      min={-100}
                      max={100}
                      required
                    />
                  </label>
                  <label>
                    Motif détaillé
                    <textarea
                      name="reason"
                      minLength={10}
                      maxLength={300}
                      required
                    />
                  </label>
                  <button className="button" disabled={busy}>
                    Enregistrer l’ajustement
                  </button>
                </form>
              </details>
            </>
          )}
        </Modal>
      )}
      {campaign && (
        <Modal title="Campagne traçable" onClose={() => setCampaign(null)}>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              save(
                "owner/campaign",
                {
                  id: f.get("id"),
                  name: f.get("name"),
                  active: f.get("active") === "on",
                  spend: f.get("spend") === "" ? null : number(f, "spend"),
                },
                () => setCampaign(null),
              );
            }}
          >
            <label>
              Code de campagne
              <input
                name="id"
                defaultValue={campaign.id}
                readOnly={!!campaign.id}
                pattern="[a-z0-9-]{2,40}"
                required
                placeholder="campus-octobre"
              />
            </label>
            <label>
              Nom
              <input name="name" defaultValue={campaign.name} required />
            </label>
            <label>
              Dépenses réelles (DT)
              <input
                name="spend"
                type="number"
                step="0.001"
                min={0}
                defaultValue={
                  campaign.spend === null ? "" : money(campaign.spend)
                }
              />
            </label>
            <label className="check-label">
              <input
                name="active"
                type="checkbox"
                defaultChecked={campaign.active}
              />{" "}
              Activer l’attribution des commandes
            </label>
            {error && <p className="error">{error}</p>}
            <button className="button" disabled={busy}>
              Enregistrer la campagne
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
function localDate(s: string | null) {
  if (!s) return "";
  const date = new Date(s);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function CampaignQr({ id }: { id: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    import("qrcode")
      .then((q) =>
        q.toDataURL(`${location.origin}/?campaign=${id}`, {
          width: 300,
          margin: 2,
          color: { dark: "#571621", light: "#f8f5ee" },
        }),
      )
      .then(setSrc);
  }, [id]);
  return src ? (
    <a
      href={src}
      download={`romantica-${id}.png`}
      aria-label={`Télécharger le QR ${id}`}
    >
      <img src={src} alt={`QR de la campagne ${id}`} />
      <small>Télécharger le QR</small>
    </a>
  ) : null;
}
