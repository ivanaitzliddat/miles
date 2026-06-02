/** Bank brand colours used for card visuals. */
export const BANK_META: Record<string, { gradient: string; text: "white" | "dark" }> = {
  DBS:     { gradient: "linear-gradient(135deg, #E31837 0%, #7A0C1A 100%)", text: "white" },
  UOB:     { gradient: "linear-gradient(135deg, #003DA5 0%, #001B5E 100%)", text: "white" },
  CITI:    { gradient: "linear-gradient(135deg, #1177BE 0%, #003F7E 100%)", text: "white" },
  OCBC:    { gradient: "linear-gradient(135deg, #E8401C 0%, #8C1900 100%)", text: "white" },
  SCB:     { gradient: "linear-gradient(135deg, #00A3A1 0%, #005E5D 100%)", text: "white" },
  HSBC:    { gradient: "linear-gradient(135deg, #DB0011 0%, #200008 100%)", text: "white" },
  MAYBANK: { gradient: "linear-gradient(135deg, #F5C400 0%, #C98A00 100%)", text: "dark"  },
  AMEX:    { gradient: "linear-gradient(135deg, #4A8BC4 0%, #1B4F8C 100%)", text: "white" },
  BOC:     { gradient: "linear-gradient(135deg, #CC2936 0%, #700010 100%)", text: "white" },
};

export function bankGradient(bank: string) {
  return BANK_META[bank]?.gradient ?? "linear-gradient(135deg, #4B5563 0%, #1F2937 100%)";
}

export function bankTextColor(bank: string) {
  return BANK_META[bank]?.text === "dark" ? "#1A1A1A" : "#FFFFFF";
}
