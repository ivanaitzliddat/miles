/**
 * API client — thin wrapper around fetch.
 *
 * All requests go through /api (proxied to Express in dev via vite.config.ts).
 * In production, VITE_API_URL overrides the base so the app talks to Railway.
 */

const BASE = import.meta.env.VITE_API_URL ?? "/api";

// Grab initData once at module load — it doesn't change during a session.
// In dev (outside Telegram) this will be an empty string, which is fine
// because the backend skips validation in non-production mode.
const INIT_DATA = window.Telegram?.WebApp?.initData ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": INIT_DATA,
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return data as T;
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: number;
  telegramId: string;
  firstName: string;
}

export interface ApiUserCard {
  id: number;
  cardId: number;
  nickname: string | null;
  billingCycleStartDay: number;
  excludedRateIds: number[];
  card: {
    id: number;
    slug: string;
    bank: string;
    name: string;
    fullName: string;
    earningRates: { id: number; description: string | null; milesPerDollar: number }[];
  };
}

export function getOrCreateUser() {
  // Identity is taken from the X-Telegram-Init-Data header by the backend.
  // No user data in the body — this prevents clients from spoofing another user's identity.
  return request<{ user: ApiUser }>("/users", { method: "POST", body: JSON.stringify({}) });
}

export function getUserCards(telegramId: number) {
  return request<{ userCards: ApiUserCard[] }>(`/users/${telegramId}/cards`);
}

// ── Cards catalog ─────────────────────────────────────────────────────────────

export interface ApiCard {
  id: number;
  slug: string;
  bank: string;
  name: string;
  fullName: string;
  status: string;
}

export function getActiveCards() {
  return request<{ cards: ApiCard[] }>("/cards");
}

export function addCardToWallet(telegramId: number, cardId: number) {
  return request<{ userCard: ApiUserCard }>(`/users/${telegramId}/cards`, {
    method: "POST",
    body: JSON.stringify({ cardId }),
  });
}

// ── Recommendations ───────────────────────────────────────────────────────────

export interface ApiRecommendation {
  userCardId: number;
  cardSlug: string;
  cardName: string;
  bank: string;
  effectiveMpd: number;
  milesEarned: number;
  capRemaining: number | null;
  capExhausted: boolean;
  exhaustedBonusMpd: number | null;
  reasoning: string;
}

export function getRecommendations(
  amountSgd: number,
  spendCategory: string,
  paymentMethod: string,
  merchantCategory?: string
) {
  return request<{ recommendations: ApiRecommendation[] }>("/recommend", {
    method: "POST",
    body: JSON.stringify({ amountSgd, spendCategory, paymentMethod, merchantCategory }),
  });
}

// ── Transactions ──────────────────────────────────────────────────────────────

export interface ApiTransaction {
  id: number;
  userCardId: number;
  amountSgd: number;
  milesEarned: number;
  effectiveMpd: number;
  spendCategory: string;
  paymentMethod: string;
  transactionDate: string;
  userCard: {
    nickname: string | null;
    card: { name: string; bank: string };
  };
}

export function logTransaction(
  userCardId: number,
  amountSgd: number,
  spendCategory: string,
  paymentMethod: string
) {
  return request<{ transaction: ApiTransaction }>("/transactions", {
    method: "POST",
    body: JSON.stringify({ userCardId, amount: amountSgd, currency: "SGD", amountSgd, spendCategory, paymentMethod }),
  });
}

export function updateCardSettings(telegramId: number, userCardId: number, excludedRateIds: number[]) {
  return request<{ userCard: ApiUserCard }>(`/users/${telegramId}/cards/${userCardId}`, {
    method: "PATCH",
    body: JSON.stringify({ excludedRateIds }),
  });
}

export function getTransactions(telegramId: number) {
  return request<{ transactions: ApiTransaction[] }>(`/users/${telegramId}/transactions`);
}
