# Welcome Tomorrow Ecopulse — Link Building Marketplace

A backlink / guest-post marketplace (like serpzilla.com) with three roles — **buyer**,
**publisher** (invite-only), and **admin** — built in Next.js 14 to match the
ranktomorrow tool's stack. Buyers order links, pay by card (Stripe, USD), funds are held
escrow-style until the link is live, then the admin pays the publisher.

Design = the Welcome Tomorrow brand system (dark theme, Outfit font, green/yellow/blue).

## Run it locally (5 minutes)

You need **Node.js 20+**. Local dev uses **SQLite** — no database to set up.

```bash
# 1. Install
npm install

# 2. Create your env file
cp .env.example .env
#    (open .env — the defaults work for local dev; set ADMIN_PASSWORD)

# 3. Create the database + demo data
npx prisma db push
npm run db:seed

# 4. Start
npm run dev
```

Open **http://localhost:3000/ecopulse**

- Sign in as **admin** with the ADMIN_EMAIL / ADMIN_PASSWORD from `.env`.
- A demo publisher and 4 approved listings are seeded so the marketplace isn't empty.
- Register a new account to try the **buyer** flow.

### Try the full flow
1. **Buyer**: register → Marketplace → open a listing → Place order → pay from wallet
   (or by card once Stripe is set) → later Confirm live.
2. **Admin**: Admin → Invites → invite a publisher by email. Email is off by default, so
   the invite link is shown on screen — open it to set a password and become a publisher.
3. **Publisher**: Add a site → it appears in the marketplace → when an order is funded,
   open it and Submit the live URL.
4. **Admin**: Orders → Mark publisher paid once completed.

## Payments (Stripe, test mode)
Add your Stripe **test** keys to `.env` (`STRIPE_SECRET_KEY`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`). Test card `4242 4242 4242 4242`, any future date,
any CVC. For the webhook locally:
```bash
stripe listen --forward-to localhost:3000/ecopulse/api/stripe/webhook
```
Put the printed signing secret in `STRIPE_WEBHOOK_SECRET`. Without Stripe keys the app
still runs — buyers just pay from their wallet balance.

## Email (optional)
Add `RESEND_API_KEY` to send invite / verification / notification emails. If it's empty,
new buyers auto-verify and invite links are shown on screen instead.

## Going to production
See **DEPLOY.md** — switch Prisma to PostgreSQL, set live env vars, build the Docker
image, and deploy under `tools.welcometomorrow.io/ecopulse` the same way ranktomorrow is
deployed.

## Project structure
- `app/` — pages (App Router) and `app/api/stripe/webhook` route
- `app/actions/` — server actions (auth, listings, orders, admin, wallet)
- `lib/` — prisma, auth (sessions), money, stripe, email, data
- `components/` — Nav, Footer, UI primitives, ListingCard
- `prisma/schema.prisma` — data model (SQLite dev → Postgres prod)
