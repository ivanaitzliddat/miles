export function fmtMiles(n: number): string {
  return Math.round(n).toLocaleString("en-SG");
}

export function fmtMpd(n: number): string {
  const r = Math.round(n * 100) / 100;
  return `${r % 1 === 0 ? r : r.toFixed(2)} mpd`;
}

export function fmtSgd(n: number): string {
  return `S$${n.toLocaleString("en-SG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** e.g. "15 Mar" */
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}

export const SPEND_TYPES = [
  { label: "Local",       spendCategory: "LOCAL"         as const, paymentMethod: "PHYSICAL"     as const, emoji: "🏙️" },
  { label: "Online",      spendCategory: "LOCAL"         as const, paymentMethod: "ONLINE"       as const, emoji: "🛒" },
  { label: "Contactless", spendCategory: "LOCAL"         as const, paymentMethod: "CONTACTLESS"  as const, emoji: "📱" },
  { label: "Foreign",     spendCategory: "FOREIGN"       as const, paymentMethod: "PHYSICAL"     as const, emoji: "✈️" },
  { label: "ASEAN FCY",   spendCategory: "FOREIGN_ASEAN" as const, paymentMethod: "PHYSICAL"     as const, emoji: "🌏" },
] as const;

export type SpendTypeOption = typeof SPEND_TYPES[number];

/** Merchant categories that affect earning rates on at least one card. */
export const MERCHANT_CATEGORIES = [
  { value: "DINING",           label: "Dining",         emoji: "🍽️" },
  { value: "SHOPPING",         label: "Shopping",       emoji: "🛍️" },
  { value: "TRAVEL",           label: "Travel",         emoji: "✈️" },
  { value: "TRANSPORT",        label: "Transport",      emoji: "🚌" },
  { value: "ONLINE_SHOPPING",  label: "Online Shopping",emoji: "📦" },
  { value: "ONLINE_TRAVEL",    label: "Online Travel",  emoji: "🏨" },
  { value: "PETROL",           label: "Petrol",         emoji: "⛽" },
  { value: "GROCERY",          label: "Grocery",        emoji: "🛒" },
  { value: "SIA_GROUP",        label: "SIA Group",      emoji: "🦁" },
  { value: "ENTERTAINMENT",    label: "Entertainment",  emoji: "🎬" },
  { value: "BEAUTY_WELLNESS",  label: "Beauty",         emoji: "💅" },
  { value: "FAMILY",           label: "Family",         emoji: "👨‍👩‍👧" },
] as const;

export type MerchantCategoryValue = typeof MERCHANT_CATEGORIES[number]["value"];
