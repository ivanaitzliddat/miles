import { SpendCategory, PaymentMethod } from "../types/card.js";

/**
 * Human-readable labels for spend categories.
 */
export const SPEND_CATEGORY_LABELS: Record<SpendCategory, string> = {
  [SpendCategory.LOCAL]: "Local (SGD)",
  [SpendCategory.FOREIGN]: "Foreign Currency",
  [SpendCategory.FOREIGN_ASEAN]: "Foreign (ASEAN)",
};

/**
 * Human-readable labels for payment methods.
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.APPLE_PAY]: "Apple Pay",
  [PaymentMethod.GOOGLE_PAY]: "Google Pay",
  [PaymentMethod.SAMSUNG_PAY]: "Samsung Pay",
  [PaymentMethod.CONTACTLESS]: "Contactless",
  [PaymentMethod.ONLINE]: "Online",
  [PaymentMethod.PHYSICAL]: "Physical Card",
};

/**
 * Common currencies for Singapore users.
 */
export const COMMON_CURRENCIES = [
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
  { code: "USD", label: "US Dollar", symbol: "US$" },
  { code: "MYR", label: "Malaysian Ringgit", symbol: "RM" },
  { code: "THB", label: "Thai Baht", symbol: "฿" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "KRW", label: "Korean Won", symbol: "₩" },
  { code: "IDR", label: "Indonesian Rupiah", symbol: "Rp" },
  { code: "VND", label: "Vietnamese Dong", symbol: "₫" },
  { code: "TWD", label: "Taiwan Dollar", symbol: "NT$" },
  { code: "HKD", label: "Hong Kong Dollar", symbol: "HK$" },
] as const;

/**
 * ASEAN country currencies (for UOB PRVI Miles bonus rate).
 */
export const ASEAN_CURRENCIES = ["MYR", "THB", "IDR", "VND"] as const;
