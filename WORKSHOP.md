# Miles Tracker — Workshop & Project Reference

## Your Profile
- **Level**: Intermediate developer
- **Known**: TypeScript, React, SQL/Databases
- **New to you**: Node.js/Express, Telegram Bot API, Telegram Mini Apps, Prisma ORM, cloud deployment, Claude API
- **Learning style**: Mixed (brief explanation → code → deeper explanation)

---

## To Resume
Tell Claude: *"I'm continuing the Miles Tracker workshop. Read `WORKSHOP.md` for my progress."*

---

## Progress

| Module | Status | Description |
|--------|--------|-------------|
| 0. Card Research & Seed Data | DONE | 21 Singapore miles cards researched, types extended, seed data ready |
| 1. Project Setup & Tooling | DONE | Monorepo, npm workspaces, shared TypeScript config |
| 2. Database & Prisma ORM | DONE | Prisma schema, migrations, seeding, local PostgreSQL |
| 3. Backend Fundamentals — Express API | DONE | REST API, middleware, Prisma queries |
| 4. Miles Calculation Engine | DONE | Business logic, cap tracking, recommendation engine, unit tests |
| 5. AI Card Research Agent | DONE | Claude API integration for unknown card onboarding |
| 6. AI Rate Monitor | DONE | Scheduled scraper, change detection, admin approval flow |
| 7. Telegram Bot | DONE | grammY long polling, commands, inline keyboards, admin callbacks |
| 8. Frontend — Telegram Mini App | DONE | React Mini App, 4 tabs: Dashboard / Recommend / Log / My Cards |
| 9. Security & Authentication | DONE | Telegram initData HMAC-SHA256 validation, ownership checks, initData header |
| 10. Cloud Deployment | NOT STARTED | Vercel + Railway, CI/CD, production bot |

---

## The Application

### What it is
A **Telegram Mini App** for tracking credit card miles earned on spending in Singapore. Users log transactions, the app tracks cumulative spend against each card's bonus rate caps, and always recommends which card to use next to maximise miles.

### The core problem it solves
Miles cards have **tiered bonus rates with spending caps** — e.g. a card earns 4 mpd on online spend but only up to S$1,000/month, then drops to 0.4 mpd. Without tracking, you waste miles by using the wrong card. This app tracks your caps in real time and tells you exactly which card to reach for.

### Architecture
```
Telegram Bot
  → Mini App (React WebView)
    → Express API
      → PostgreSQL (transactions, cards, users)
      → Claude API (card research agent, rate monitoring)
```

---

## Full Use Cases

### UC-1: Log a transaction
User taps "Add Spend" in the Mini App, enters amount, currency, merchant, payment method. App calculates miles earned accounting for any caps, saves the transaction, and updates the dashboard.

### UC-2: Get card recommendation
Before spending, user taps "Which card?" and enters the amount + category (local/foreign/ASEAN). App checks each card's remaining cap this month and ranks them by effective mpd right now — not just the headline rate.

**Example:**
> Spending S$300 online
> - HSBC Revolution: 4 mpd BUT you've used S$950 of your S$1,000 cap → only S$50 earns 4 mpd, remaining S$250 earns 0.4 mpd → **effective: 1.03 mpd**
> - Citi Rewards: 4 mpd online, cap not hit → **effective: 4 mpd** ✓ Use this

### UC-3: Dashboard summary
Mini App home screen shows:
- Total miles earned (all time + this month)
- Per-card breakdown: miles earned, spend total, reward balance, cap remaining this month
- Recent transactions
- Alerts: "Your HSBC Revolution cap resets in 3 days"

### UC-4: Add a known card
User goes to "My Cards" → "Add Card" → scrollable list of 21 pre-loaded Singapore miles cards → selects theirs → card added to their wallet.

### UC-5: Add an unknown card (AI flow)
User taps "My card isn't here" → types card name (e.g. "DBS Takashimaya Visa") → AI agent searches the bank's website → extracts rates, caps, reward type → presents a confirmation card → user confirms or corrects → card saved to catalog (status: PENDING) → available to all users after admin approval.

### UC-6: Rate change alert (AI monitor)
Weekly scheduled job runs Claude agent against each bank's benefit page. Detects that UOB PRVI Miles local rate changed from 1.4 mpd to 1.2 mpd. Sends admin a Telegram message:

> "Rate change detected on UOB PRVI Miles:
> Local MPD: 1.4 → 1.2
> Source: [uob.com.sg/...]
> Approve change?"

Admin taps Approve → DB updated → affected users notified.

### UC-7: Bulk import from bank statement (future)
User uploads a PDF bank statement → AI extracts all transactions → presents them for confirmation → bulk saves to history.

### UC-8: Receipt OCR (future)
User sends a photo of a receipt to the Telegram bot → AI reads amount, merchant, currency → pre-fills the Add Spend form.

---

## Card Catalog (21 cards, as of March 2026)

| Card | Bank | Local MPD | Foreign MPD | Bonus MPD | Bonus Cap |
|------|------|-----------|-------------|-----------|-----------|
| Altitude Visa Signature | DBS | 1.3 | 2.2 | — | — |
| Altitude American Express | DBS | 1.3 | 2.2 | — | — |
| Vantage | DBS | 1.5 | 2.2 | — | — |
| Woman's World Mastercard | DBS | 0.4 | 1.2 | 4.0 mpd online | S$1,000/mo |
| PRVI Miles | UOB | 1.4 | 2.4 | 3.0 mpd ASEAN FCY | — |
| KrisFlyer Visa | UOB | 1.2 | 2.4 | 3.0 mpd SIA Group | — |
| Visa Infinite Metal | UOB | 1.4 | 2.4 | — | — |
| Lady's Card | UOB | 0.4 | 0.4 | 10 mpd chosen category | S$1,000/mo |
| PremierMiles | Citi | 1.2 | 2.2 | — | — |
| Rewards | Citi | 0.4 | 0.4 | 4.0 mpd online+contactless | S$1,000/mo |
| Prestige | Citi | 1.3 | 2.0 | — | — |
| 90°N | OCBC | 1.3 | 2.1 | — | — |
| VOYAGE | OCBC | 1.3 | 2.2 | — | — |
| Journey | SCB | 1.2 | 2.0 | 3.0 mpd online SGD | S$1,000/mo |
| Visa Infinite | SCB | 1.0–1.4 | 3.0 | — | — |
| Revolution | HSBC | 0.4 | 0.4 | 4.0 mpd contactless+online | S$1,000/mo |
| TravelOne | HSBC | 1.2 | 2.4 | — | — |
| Horizon Visa Signature | Maybank | 0.4 | 0.4 | up to 2.8 mpd categories | S$800 min spend |
| KrisFlyer Credit Card | Amex | 1.1 | 1.1 | — | — |
| KrisFlyer Ascend | Amex | 1.2 | 1.2 | — | — |
| Elite Miles World Mastercard | BOC | 1.4 | 2.8 | — | — |

**Key nuances captured in seed data:**
- UOB, OCBC, Maybank: S$5 spending blocks (earn on floor-to-$5 of each transaction)
- HSBC Revolution: 4 mpd on contactless + online spend (permanent from April 2026; was promotional)
- HSBC TravelOne: headline 1.2/2.4 mpd but effective KrisFlyer rate is 1.0/2.0 mpd (3:1 transfer ratio)
- SCB Visa Infinite: base 1.0 mpd, unlocks 1.4 mpd local only if monthly statement ≥ S$2,000
- Maybank Horizon: requires min S$800/month spend to unlock bonus category rates
- Amex KrisFlyer cards: earn same rate local and foreign (no FCY bonus)
- BOC Elite Miles: KrisFlyer only (Asia Miles removed July 2025); excludes CardUp/iPayMy

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + Vite (Telegram Mini App) |
| Backend | Node.js + Express + TypeScript |
| Bot | grammY (Telegram bot framework) |
| Database | PostgreSQL + Prisma ORM |
| AI | Claude API (card research agent, rate monitor) |
| Shared | npm workspace package — types + card seed data |
| Deployment | Vercel (frontend) + Railway (backend + DB) |

---

## Architecture Decisions

### Payment method: contactless = Apple Pay = Google Pay = Samsung Pay

`PaymentMethod` has **3 values only**: `CONTACTLESS`, `ONLINE`, `PHYSICAL`.

Apple Pay, Google Pay, and Samsung Pay are all covered by `CONTACTLESS`. Banks receive identical NFC transaction data regardless of whether the customer tapped a physical card or a mobile wallet — they literally cannot distinguish them at the transaction record level. No Singapore miles card currently differentiates Apple Pay from a physical paywave tap for base earning rates.

### Merchant categories are separate from payment methods

`MerchantCategory` captures *what you buy*:
`DINING`, `TRAVEL`, `SIA_GROUP`, `PETROL`, `GROCERY`, `SHOPPING`, `TRANSPORT`, `ENTERTAINMENT`, `BEAUTY_WELLNESS`, `EDUCATION`, `HEALTHCARE`, `UTILITIES`, `ONLINE_SHOPPING`, `ONLINE_TRAVEL`, `FAMILY`

`EarningRate` has two optional fields for this:
- `merchantCategories` — rate only applies to these merchant types (empty/null = all)
- `excludedMerchantCategories` — rate is explicitly excluded for these (e.g. Citi Rewards excludes travel MCCs from 4 mpd)

Cards that require merchant category data to correctly calculate rates:

| Card | Merchant category dependency |
|------|-----|
| UOB KrisFlyer | 3 mpd only on SIA_GROUP; 2.4 mpd on DINING / TRANSPORT / ONLINE_SHOPPING / ONLINE_TRAVEL |
| UOB Lady's Card | 4–10 mpd on one user-chosen category per quarter |
| HSBC Revolution | 4 mpd on DINING / SHOPPING / TRAVEL / TRANSPORT (contactless + online) |
| Citi Rewards | 4 mpd on contactless + online, **excluding** TRAVEL MCCs |
| Maybank Horizon | top 2.8 mpd tier applies to TRAVEL (air tickets) specifically |

### Card catalog is DB-first, not code-first
The `CARD_DEFINITIONS` constant in `shared` is **seed data only** — it populates the DB on first run. The DB is the runtime source of truth. Cards can be added, updated, and versioned without redeploying.

### Card status lifecycle
```
DRAFT      — AI-populated, not yet reviewed
PENDING    — Submitted by user, awaiting admin approval
ACTIVE     — Verified, visible to all users
OUTDATED   — Known to have stale rates (flagged by monitor)
```

### Spending caps tracked per billing cycle
Each `EarningRate` row in the DB can have a `monthlyCapSgd` or `annualCapSgd`. The calculation engine tracks cumulative spend per card per rate category per billing period and applies the correct (possibly lower) rate once a cap is hit.

### Recommendation engine ranks by effective MPD
When a user asks "which card?", the engine does not use headline rates. It calculates:
```
effectiveMpd = (milesAtBonusRate * capRemaining + milesAtBaseRate * spillover) / totalSpend
```
Cards are ranked by this figure, not the rate printed on the card.

### AI card research flow
Unknown card → Claude API call with web search → structured JSON extraction → user confirmation → stored as DRAFT → admin approval → ACTIVE.

### AI rate monitor
Weekly cron job → Claude reads official bank URLs stored per card → compares to DB → diffs sent to admin via Telegram → human approves → DB updated → rate history recorded.

---

## Database Schema (planned for Module 2)

```
User
  id, telegramId, firstName, lastName, username, createdAt

Card                          ← master catalog
  id, slug, bank, name, fullName, rewardType, rewardUnit,
  rewardToMilesRate, primaryMilesPartner, transferPartners,
  transferFeeSgd, officialUrl, notes,
  status (DRAFT|PENDING|ACTIVE|OUTDATED),
  lastVerifiedAt, sourceUrl, createdAt, updatedAt

EarningRate                   ← one card has many rates
  id, cardId, spendCategory, paymentMethod,
  merchantCategories (string[]),         ← empty = all merchant types
  excludedMerchantCategories (string[]), ← e.g. Citi Rewards excludes TRAVEL
  milesPerDollar, rewardPerDollar, roundDownTo,
  monthlyCapSgd, annualCapSgd, minimumMonthlySpendSgd,
  description

RateHistory                   ← audit trail of rate changes
  id, cardId, earningRateId, field, oldValue, newValue,
  effectiveDate, sourceUrl, approvedBy, createdAt

UserCard                      ← cards in a user's wallet
  id, userId, cardId, nickname, billingCycleStartDay, addedAt

Transaction
  id, userId, userCardId, amount, currency, amountSgd,
  spendCategory, paymentMethod, description, merchantName,
  rewardEarned, milesEarned, effectiveMpd,
  transactionDate, createdAt
```

---

## Module Format
Each module follows:
1. **Concept briefing** — What we're building and why
2. **Guided implementation** — Step-by-step code with explanations
3. **Checkpoint** — Verify it works before moving on
4. **Deep dive** — Explain what happened under the hood

---

## Module 1: Project Setup & Tooling (COMPLETED)

### What was built
- npm workspaces monorepo: `shared`, `backend`, `frontend`
- Shared TypeScript base config (`tsconfig.base.json`)
- `packages/shared` — Types and constants wired into both packages
- Type-checking passes end-to-end

### Key files
- `package.json` — root workspace config
- `tsconfig.base.json` — shared TS settings (ES2022, strict, bundler resolution)
- `packages/shared/src/types/card.ts` — Bank, RewardType, SpendCategory, PaymentMethod, EarningRate, CardDefinition
- `packages/shared/src/types/transaction.ts` — Transaction, CreateTransactionRequest, MilesSummary
- `packages/shared/src/types/user.ts` — User, UserCard
- `packages/shared/src/constants/cards.ts` — 21 card definitions (seed data)
- `packages/shared/src/constants/categories.ts` — labels, currencies, ASEAN currency list

---

## Module 2: Database & Prisma ORM (NEXT UP)

### What you'll learn
- Prisma ORM (schema-first, migrations, seeding)
- How Prisma maps to SQL you already know
- Setting up local PostgreSQL

### What we'll build
- Full Prisma schema matching the planned DB structure above
- Seed script that reads from `CARD_DEFINITIONS` and populates Card + EarningRate tables
- Migration + Prisma Studio to inspect the data

### Prerequisite decision needed
**Docker Desktop** (local PostgreSQL) OR **free cloud Postgres** (Supabase / Neon)?

---

## Development Environments

| Phase | Setup |
|-------|-------|
| Modules 1–6 | tsx watch + vite dev + local PostgreSQL |
| Modules 7+ | ngrok tunnel + test Telegram bot |
| Module 10 | Vercel (frontend) + Railway (backend + DB) |
