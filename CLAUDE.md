@AGENTS.md

Web app: autókereskedők feltöltik az autós fotóikat, mi automatikusan kicseréljük a hátteret AI-jal (remove.bg API), és letölthető végeredményt adunk.

## Tech stack

- Next.js 14+ App Router + TypeScript + Tailwind + shadcn/ui
- Auth: Clerk (@clerk/nextjs)
- DB: PostgreSQL (Supabase hosting) + Prisma ORM
- Storage: Cloudflare R2 (S3-kompatibilis, AWS SDK-val)
- AI: remove.bg API (type=car)
- Payment: Stripe (későbbi fázis)

## Konvenciók

- App Router, Server Components default, Client Component csak interaktivitáshoz
- Server Actions a mutation-ökhöz
- Folder struktúra:
  - `src/app/` — routes
  - `src/components/ui/` — shadcn komponensek
  - `src/components/` — egyéb UI
  - `src/lib/` — kliensek és utility-k (prisma, r2, removebg)
  - `src/server/` — server-only logika, Server Actions
  - `prisma/` — schema és migrations
- Env változók `.env.local`-ban (commitolva soha)
- Magyar UI nyelv, Clerk `huHU` locale

## Known issues

- **remove.bg HD kreditek hiányoznak.** A `processImage` action `size: "auto"`-val hívja a remove.bg-t, mert a `size: "full"` 402 (insufficient_credits) hibát ad — a kulcsunkon nincs paid HD credit, csak a free tier preview keret. `auto` ezért preview felbontáson tér vissza (max 0.25 MP, ~500×500). Ha HD output kell, először vegyél HD krediteket a remove.bg-n, utána `process.ts`-ben átállítani `size: "full"`-re.
- **`UNLIMITED_CREDIT_EMAILS`** env változó dev/test bypass: a listán szereplő User-eknek a `processImage` se nem ellenőriz, se nem dekrementál `creditsLeft`-et. Production-ben üresen kell hagyni.
