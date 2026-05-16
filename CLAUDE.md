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
