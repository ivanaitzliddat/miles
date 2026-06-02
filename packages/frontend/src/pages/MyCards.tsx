import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserCards, getActiveCards, addCardToWallet, updateCardSettings } from "../api/client";
import type { ApiCard, ApiUserCard } from "../api/client";
import { bankGradient, bankTextColor } from "../utils/banks";
import { CARD_ELIGIBILITY, getRateIdsForRequirement } from "../utils/eligibility";

interface Props { telegramId: number; }

export default function MyCards({ telegramId }: Props) {
  const qc = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);
  const [configuringCard, setConfiguringCard] = useState<ApiUserCard | null>(null);
  const [toast, setToast] = useState("");

  const { data: cardsData, isLoading } = useQuery({
    queryKey: ["userCards", telegramId],
    queryFn: () => getUserCards(telegramId),
  });

  const { data: allCardsData } = useQuery({
    queryKey: ["allCards"],
    queryFn: getActiveCards,
    enabled: showPicker,
  });

  const addMutation = useMutation({
    mutationFn: (cardId: number) => addCardToWallet(telegramId, cardId),
    onSuccess: (_, cardId) => {
      qc.invalidateQueries({ queryKey: ["userCards", telegramId] });
      const name = allCardsData?.cards.find(c => c.id === cardId)?.name ?? "Card";
      setToast(`${name} added ✓`);
      setTimeout(() => setToast(""), 2500);
      setShowPicker(false);
    },
  });

  const settingsMutation = useMutation({
    mutationFn: ({ userCardId, excludedRateIds }: { userCardId: number; excludedRateIds: number[] }) =>
      updateCardSettings(telegramId, userCardId, excludedRateIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userCards", telegramId] });
      qc.invalidateQueries({ queryKey: ["recommend", telegramId] });
      setToast("Settings saved ✓");
      setTimeout(() => setToast(""), 2000);
      setConfiguringCard(null);
    },
  });

  const userCards = cardsData?.userCards ?? [];
  const ownedIds  = new Set(userCards.map(uc => uc.cardId));
  const available = (allCardsData?.cards ?? []).filter(c => !ownedIds.has(c.id));

  const byBank = available.reduce<Record<string, ApiCard[]>>((acc, c) => {
    (acc[c.bank] ??= []).push(c);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="skeleton" style={{ height: 28, width: 120, borderRadius: 6 }} />
        </div>
        {[1, 2].map(i => (
          <div key={i} className="skeleton" style={{ width: "100%", aspectRatio: "1.586", borderRadius: 18, marginBottom: 16 }} />
        ))}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">My Cards</div>
        <div className="page-sub">{userCards.length} card{userCards.length !== 1 ? "s" : ""} in your wallet</div>
      </div>

      {/* Credit card shapes */}
      {userCards.map(uc => {
        const bank = uc.card.bank;
        const name = uc.nickname ?? uc.card.name;
        const textColor = bankTextColor(bank);
        const hasEligibility = !!CARD_ELIGIBILITY[uc.card.slug];

        return (
          <div key={uc.id} style={{ position: "relative", marginBottom: 16 }}>
            <div
              className="credit-card"
              style={{ background: bankGradient(bank), color: textColor, marginBottom: 0 }}
            >
              <div className="credit-card-top">
                <span className="credit-card-bank">{bank}</span>
                <div className="credit-card-chip" />
              </div>
              <div>
                <div className="credit-card-name">{name}</div>
                <div className="credit-card-miles" style={{ opacity: textColor === "#1A1A1A" ? 0.6 : 0.75 }}>
                  {uc.card.fullName}
                </div>
              </div>
            </div>

            {/* Configure button for cards with eligibility requirements */}
            {hasEligibility && (
              <button
                onClick={() => setConfiguringCard(uc)}
                style={{
                  marginTop: 8,
                  width: "100%",
                  background: "var(--card-bg)",
                  border: "none",
                  borderRadius: "var(--r-sm)",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  boxShadow: "var(--card-shadow)",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--hint)" }}>⚙️ Card eligibility settings</span>
                <span style={{ color: "var(--hint)", fontSize: 14 }}>›</span>
              </button>
            )}
          </div>
        );
      })}

      {/* Add card button */}
      <button className="add-card-btn" onClick={() => setShowPicker(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
          <rect x="2" y="5" width="20" height="14" rx="2"/>
          <line x1="12" y1="10" x2="12" y2="16"/>
          <line x1="9" y1="13" x2="15" y2="13"/>
        </svg>
        Add a card
      </button>

      {/* Add card sheet */}
      {showPicker && (
        <div className="sheet-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowPicker(false); }}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <span className="sheet-title">Add a card</span>
              <button className="sheet-close" onClick={() => setShowPicker(false)}>✕</button>
            </div>
            <div className="sheet-body">
              {addMutation.error && (
                <div className="error-banner">{(addMutation.error as Error).message}</div>
              )}
              {available.length === 0 && (
                <div className="empty" style={{ padding: "32px 0" }}>
                  <p>You already have all available cards! 🎉</p>
                </div>
              )}
              {Object.entries(byBank).sort().map(([bank, cards]) => (
                <div key={bank} className="section">
                  <div className="section-title">{bank}</div>
                  <div className="card">
                    {cards.map(c => (
                      <PickerRow
                        key={c.id}
                        card={c}
                        isAdding={addMutation.isPending && addMutation.variables === c.id}
                        onTap={() => !addMutation.isPending && addMutation.mutate(c.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Eligibility config sheet */}
      {configuringCard && (
        <EligibilitySheet
          uc={configuringCard}
          onSave={(excludedRateIds) => settingsMutation.mutate({ userCardId: configuringCard.id, excludedRateIds })}
          onClose={() => setConfiguringCard(null)}
          isSaving={settingsMutation.isPending}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ── Eligibility sheet ─────────────────────────────────────────────────────────

function EligibilitySheet({ uc, onSave, onClose, isSaving }: {
  uc: ApiUserCard;
  onSave: (excludedRateIds: number[]) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const requirements = CARD_ELIGIBILITY[uc.card.slug] ?? [];

  // Build initial toggle state from current excludedRateIds
  const initialState = Object.fromEntries(
    requirements.map(req => {
      const rateIds = getRateIdsForRequirement(uc.card.earningRates, req);
      // If ANY of the rate IDs for this requirement are excluded → toggle is OFF
      const isExcluded = rateIds.some(id => uc.excludedRateIds.includes(id));
      return [req.id, !isExcluded]; // true = user HAS this eligibility
    })
  );

  const [toggles, setToggles] = useState<Record<string, boolean>>(initialState);

  function handleSave() {
    // Collect rate IDs to exclude based on which toggles are OFF
    const excluded: number[] = [];
    for (const req of requirements) {
      if (!toggles[req.id]) {
        const ids = getRateIdsForRequirement(uc.card.earningRates, req);
        excluded.push(...ids);
      }
    }
    onSave(excluded);
  }

  return (
    <div className="sheet-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <span className="sheet-title">{uc.card.name} — Settings</span>
          <button className="sheet-close" onClick={onClose}>✕</button>
        </div>
        <div className="sheet-body">
          <div className="hint-text" style={{ marginBottom: 16, lineHeight: 1.5 }}>
            Some bonus rates require linked accounts or products.
            Toggle off what you don't have so we show accurate rates.
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            {requirements.map(req => (
              <div key={req.id} className="list-row" style={{ cursor: "pointer" }} onClick={() => setToggles(t => ({ ...t, [req.id]: !t[req.id] }))}>
                <div className="row-main">
                  <div className="row-title" style={{ fontSize: 13 }}>{req.question}</div>
                </div>
                <Toggle on={toggles[req.id] ?? true} />
              </div>
            ))}
          </div>

          <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ on }: { on: boolean }) {
  return (
    <div style={{
      width: 44,
      height: 26,
      borderRadius: 13,
      background: on ? "var(--success)" : "var(--card-border)",
      position: "relative",
      transition: "background 0.2s",
      flexShrink: 0,
    }}>
      <div style={{
        position: "absolute",
        top: 3,
        left: on ? 21 : 3,
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        transition: "left 0.2s",
      }} />
    </div>
  );
}

// ── Add card picker row ───────────────────────────────────────────────────────

function PickerRow({ card, isAdding, onTap }: {
  card: ApiCard; isAdding: boolean; onTap: () => void;
}) {
  return (
    <div
      className="list-row"
      style={{ cursor: "pointer", opacity: isAdding ? 0.5 : 1 }}
      onClick={onTap}
    >
      <div
        className="bank-dot"
        style={{ background: bankGradient(card.bank), color: bankTextColor(card.bank) }}
      >
        {card.bank.slice(0, 2)}
      </div>
      <div className="row-main">
        <div className="row-title">{card.name}</div>
        <div className="row-sub">{card.fullName}</div>
      </div>
      <div style={{ color: "var(--brand)", fontSize: 20 }}>
        {isAdding ? "…" : "+"}
      </div>
    </div>
  );
}
