import { SpendCategory, PaymentMethod } from "./card.js";

/**
 * A recorded spending transaction.
 */
export interface Transaction {
  id: number;
  userId: number;
  cardId: number;
  amount: number;
  currency: string;
  spendCategory: SpendCategory;
  paymentMethod: PaymentMethod;
  description: string | null;
  merchantName: string | null;
  rewardEarned: number; // Raw reward points earned (e.g., DBS Points)
  milesEarned: number; // Equivalent air miles
  transactionDate: string; // ISO date string
  createdAt: string;
}

/**
 * Request body for creating a new transaction.
 */
export interface CreateTransactionRequest {
  cardId: number;
  amount: number;
  currency: string;
  spendCategory: SpendCategory;
  paymentMethod: PaymentMethod;
  description?: string;
  merchantName?: string;
  transactionDate?: string;
}

/**
 * Summary data for the dashboard.
 */
export interface MilesSummary {
  totalMiles: number;
  thisMonthMiles: number;
  totalTransactions: number;
  byCard: CardSummary[];
  recentTransactions: Transaction[];
}

export interface CardSummary {
  cardId: number;
  cardSlug: string;
  bank: string;
  cardName: string;
  totalMiles: number;
  totalSpend: number;
  rewardBalance: number;
  rewardUnit: string;
  transactionCount: number;
}
