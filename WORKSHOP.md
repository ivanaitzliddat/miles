# Miles Tracker - Workshop Progress

## Your Profile
- **Level**: Intermediate developer
- **Known**: TypeScript, React, SQL/Databases
- **New to you**: Node.js/Express, Telegram Bot API, Telegram Mini Apps, Prisma ORM, cloud deployment
- **Learning style**: Mixed (brief explanation → code → deeper explanation)

---

## Progress

| Module | Status | Description |
|--------|--------|-------------|
| 1. Project Setup & Tooling | DONE | Monorepo, npm workspaces, shared TypeScript config |
| 2. Database & Prisma ORM | NOT STARTED | Prisma schema, migrations, seeding, local PostgreSQL |
| 3. Backend Fundamentals - Express API | NOT STARTED | REST API, middleware, Prisma queries |
| 4. Miles Calculation Engine | NOT STARTED | Business logic, unit testing with Vitest |
| 5. Telegram Bot | NOT STARTED | grammY framework, bot commands, webhooks |
| 6. Frontend - Telegram Mini App | NOT STARTED | React Mini App inside Telegram WebView |
| 7. Security & Authentication | NOT STARTED | Telegram initData HMAC-SHA256 validation |
| 8. Cloud Deployment | NOT STARTED | Vercel + Railway, CI/CD, production bot |

---

## Module Format
Each module follows:
1. **Concept briefing** - What we're building and why
2. **Guided implementation** - Step-by-step code with explanations
3. **Checkpoint** - Verify it works before moving on
4. **Deep dive** - Explain what happened under the hood

---

## Module 1: Project Setup & Tooling (COMPLETED)

### What was built
- npm workspaces monorepo with 3 packages: `shared`, `backend`, `frontend`
- Shared TypeScript base config (`tsconfig.base.json`)
- `packages/shared` - Types (Card, Transaction, User) and constants (card definitions with MPD rates)
- `packages/backend` - Placeholder entry point, wired to shared package
- `packages/frontend` - Placeholder React app, wired to shared package
- All type-checking passes, backend successfully imports from shared

### Key files created
- `package.json` - Root workspace config
- `tsconfig.base.json` - Shared TS settings (ES2022, strict, bundler resolution)
- `.gitignore`, `.env.example`
- `packages/shared/src/types/card.ts` - Bank, RewardType, SpendCategory, PaymentMethod enums + CardDefinition interface
- `packages/shared/src/types/transaction.ts` - Transaction, CreateTransactionRequest, MilesSummary types
- `packages/shared/src/types/user.ts` - User, UserCard types
- `packages/shared/src/constants/cards.ts` - DBS Altitude, UOB PRVI Miles, Citi PremierMiles definitions
- `packages/shared/src/constants/categories.ts` - Labels, currencies, ASEAN currency list

### Key concepts learned
- **npm workspaces**: `"@miles-tracker/shared": "*"` in package.json lets packages import from each other via symlinks
- **TypeScript project references**: `"references"` + `"composite": true` enables cross-package type checking
- Shared package must be built (`tsc`) before other packages can type-check against it

---

## Module 2: Database & Prisma ORM (NEXT UP)

### What you'll learn
- Prisma ORM (schema-first approach, migrations, seeding)
- How Prisma maps to SQL you already know
- Setting up local PostgreSQL (via Docker or cloud provider)

### What we'll build
- Full Prisma schema: User, Card, EarningRate, UserCard, Transaction
- Seed script to populate card data from shared constants
- Run migration + inspect DB via Prisma Studio

### Prerequisite decision needed
Docker Desktop (for local PostgreSQL) OR free cloud Postgres (Supabase/Neon)?

---

## Architecture Overview
```
User opens Telegram → Bot sends Mini App button →
React app loads in WebView → API calls to Express backend →
PostgreSQL stores data → Miles calculated and returned
```

## Tech Stack
- **Frontend**: React + TypeScript + Vite (Telegram Mini App in WebView)
- **Backend**: Node.js + Express + TypeScript + grammY (bot framework)
- **Database**: PostgreSQL + Prisma ORM
- **Shared**: TypeScript types + card constants (npm workspace package)

## Development Environments
- **Local dev** (Modules 1-4): tsx watch + vite dev + Docker PostgreSQL
- **Local + Telegram** (Modules 5+): ngrok tunnel + test bot
- **Production** (Module 8): Vercel (frontend) + Railway (backend + DB)

## Card Data

| Card | Bank | Local MPD | Foreign MPD | Reward Unit |
|------|------|-----------|-------------|-------------|
| Altitude Visa Signature | DBS | 1.3 | 2.2 | DBS Points |
| PRVI Miles | UOB | 1.4 | 2.4 (3.0 ASEAN) | UNI$ |
| PremierMiles | Citi | 1.2 | 2.2 | Citi Miles |

## To Resume
Tell Claude: "I'm continuing the Miles Tracker workshop. Read `WORKSHOP.md` for my progress. I'm on Module 2."
