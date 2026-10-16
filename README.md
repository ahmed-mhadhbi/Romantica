# ROMANTICA CLUB

French, mobile-first restaurant PWA for Romantica, Mahdia. Next.js App Router, React, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Zod, bcrypt passwords and opaque database-backed sessions. The restaurant is closed to online orders and all proposed student discounts, combos and QR campaigns are inactive on first seed.

## Run locally

Node 22.12+ and PostgreSQL 17+ are recommended. Install with `npm ci`.

1. Copy `.env.example` to `.env`. Set a PostgreSQL URL, `APP_URL`, owner email and a unique password of at least 12 characters. Do not commit this file.
2. Start your PostgreSQL service. For Docker, set `POSTGRES_PASSWORD` and run `docker compose up -d`. Set `DATABASE_URL` to the same credentials.
3. Run `npm run db:migrate`, then `npm run db:seed`.
4. Run `npm run dev` and open [http://localhost:3000](http://localhost:3000).
5. Sign in at [/staff](http://localhost:3000/staff) with the owner credentials. Configure hours, address, contact, costs and availability. Enable ordering when the team is ready to accept requests.

An optional persistent local PostgreSQL process is provided for Windows/macOS/Linux without Docker: `npm run db:local`. It listens on `127.0.0.1:54329`, uses database `romantica`, user `romantica`, password `romantica-local-only`, and keeps its files in ignored `.postgres/`. Keep the process running and set `DATABASE_URL=postgresql://romantica:romantica-local-only@127.0.0.1:54329/romantica?schema=public`. This is a development service, not a production database. Never expose its port to the internet.

The seed is repeatable and preserves owner edits. It does not reset an existing owner's password. Reset credentials through a trusted database maintenance process if necessary; do not rerun the seed expecting a reset.

## Verify

```sh
npm test
npm run lint
npm run build
```

For transaction integration tests, create a **dedicated** `romantica_test` database, point `DATABASE_URL` to it, apply migrations, then run `npm run test:integration`. The script refuses a URL without `romantica_test`. Tests cover concurrent redemption and concurrent order retries against real PostgreSQL, unique receipts and rollback, payment-only earning, account verification, refunds, cancellation, roles and guest checkout. Unit tests independently check all 38 prices, bundle arithmetic and price allocation, reward pairs, category eligibility, inactive offers, three-decimal display and state transitions.

## Product behavior

- All prices are integer millimes. Server totals are authoritative. Browser totals are estimates. Unknown costs remain null and are never replaced by invented estimates.
- 38 original products across 7 categories, searchable/filterable; owner editing of descriptions, photo URLs, prices, costs, availability and discount/reward/point eligibility. Baguette orders require a filling selection. Unclear source terms are preserved verbatim for owner correction.
- Guest orders and optional Club accounts; requested pickup time is between 5 minutes and 24 hours. No automatic acceptance or online payment. Staff explicitly accepts, prepares, marks ready and confirms payment and handover with a unique receipt.
- A verified Club account earns exactly one point per eligible paid meal unit at collection. Canceled/refunded/free items do not earn. Combo points default off. Potential pending points do not spend like available points.
- 8 points unlock two identical eligible items for the standard price of one. Reward orders contain only that pair. Student, combo and reward modes cannot stack. Points are reserved at order request, deducted exactly once at paid collection, released on cancellation and restored on a full refund. Reservations prevent parallel spending. Refunds reverse earned points even if spent, potentially creating a negative balance that prevents new rewards.
- Full-order refunds only. Staff records a real external refund; the app does not move money. Partial refunds and partial fulfillment are intentionally unsupported because they require explicit item-level point and discount allocation.
- Owner-only controls include staff roles, manual point adjustments with reasons, campaign configuration, costs, rewards and margin thresholds. Cashier can verify customers/students, accept orders, confirm payment/handover, cancel and record full refunds. Kitchen can accept, prepare and mark ready, with customer phone omitted. Customers cannot use staff APIs.
- Contribution margin = revenue minus owner-supplied variable costs; excludes fixed costs and tax accounting. Reward margin includes two units of cost; bundle margins include actual constituents. Historical orders snapshot prices and costs. Unknown costs make aggregate margins explicitly incomplete. Active bundles must be deactivated before constituent prices/costs change. Below-threshold or unknown-cost campaign activation requires an explicit owner override reason stored in the audit log.
- QR campaign URLs use `/?campaign=iset` (also isima, fseg, workplaces, events). QR PNGs are generated locally in the browser. Attribution is per session, and only active campaigns are attributed at order creation. ROI = (attributed contribution margin − campaign spend) / spend; shown only with known costs and positive actual spend. It measures attributed performance, not causal lift.
- Private feedback, Google Maps search directions, optional WhatsApp fallback, and explicit marketing consent/opt-out. No fabricated ratings, customers or sales. No messages, notifications or marketing are automatically sent.

## Security and operations

Same-origin write requests, HttpOnly/SameSite session cookies (Secure in production), hashed random session tokens, bcrypt passwords, role checks, validated inputs, unique order idempotency keys, unique receipt IDs, serializable database transactions with conflict retries, reward reservations, durable point ledger and audit trail. Customer routes never return password hashes or ingredient costs. Private account/staff data is not cached by the service worker.

Rate limits use durable PostgreSQL counters. In production set `TRUST_PROXY=true` **only** behind a trusted proxy that overwrites `X-Forwarded-For`; otherwise clients share a conservative local bucket. Periodically delete expired `RateLimit` and `Session` records. Set a proxy body limit (30 KB) and upstream connection/request timeouts. The app also rejects oversized request bodies. Use HTTPS and configure `APP_URL` exactly to the public origin for write-origin checks.

Back up PostgreSQL with tested restore procedures. Limit database access, rotate secrets, set staff offboarding procedures, and retain customer data only as long as operationally required. Establish an owner process for account access/deletion and receipt reconciliation. Audit and ledger records have no deletion API. Apply data-retention policies through controlled, audited maintenance.

## Deployment

Run on a Node host with a persistent managed PostgreSQL database; this app is not a static export. Set `DATABASE_URL` and `APP_URL`; bootstrap with owner environment variables once, then remove the bootstrap password from the runtime environment. Run `npm ci`, `npm run db:migrate`, `npm run db:seed`, `npm run build`, `npm start`. Supply environment variables through the deployment secret store. Run migrations as a single release job before rolling out the app. Use a database role with only the required application permissions, a separate migration role and TLS for remote database connections.

PWA manifest includes PNG/maskable icons, install support and a service worker with a safe offline page. It caches illustrative static images only, never orders, account responses or staff pages. Orders require a connection. Verify installability on a real HTTPS deployment. `src/lib/i18n.ts` defines French/Tunisian Arabic locales and direction; the released UI is French. A full Arabic translation and RTL visual review remain a separate release step.

## Owner approvals before launch

1. Confirm all source menu details, particularly Pizza Romantica ingredients and the word “soule” on two plated meals. Confirm actual allergen information, availability, photographs and portion presentation.
2. Enter actual variable costs; review margins and the initial six reward-eligible items.
3. Approve, edit or keep inactive the proposed 20% student discount and three bundles; set student verification duration and any campaign dates. Leave combo points off until reviewed.
4. Confirm hours, exact location, WhatsApp number, staff roles and operational readiness; then open ordering.
5. Replace illustrative photos with approved restaurant images; confirm privacy/retention, marketing consent practice, hosting origin and database backups.

## Scope and operational limits

This implementation has real local persistence and order/loyalty workflows. There is no payment gateway, email verification/recovery service, push sender, stock quantity depletion, ingredient inventory system, image upload storage, referral payout engine or automated opening-hours scheduling. Availability is an owner-controlled switch; photos use owner-supplied URLs. Reporting intentionally shows a bounded history (2,000 orders), the queue at most 200 open orders, customer lists at most 200 accounts, and account history 50 orders. Add pagination and retention jobs before higher-volume operation. Public browsing falls back to the source menu if PostgreSQL is unavailable, but ordering is blocked and the UI says so. The application has not been publicly deployed by this local build.
