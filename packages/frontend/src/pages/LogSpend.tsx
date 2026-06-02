/**
 * Log Spend — record a transaction you already made.
 *
 * You already spent the money and know which card you used.
 * No recommendations shown — just: amount, type, pick your card, done.
 *
 * Compare with Recommend (Best Card) which is used *before* spending.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserCards, logTransaction } from "../api/client";
import type { ApiUserCard } from "../api/client";
import { fmtMiles, fmtMpd, fmtSgd, SPEND_TYPES } from "../utils/format";
import { bankGradient, bankTextColor } from "../utils/banks";

interface Props { telegramId: number; }

export default function LogSpend({ telegramId }: Props) {
  const qc = useQueryClient();

  const [raw, setRaw]       = useState("");
  const [typeIdx, setTypeIdx] = useState(0);
  const [result, setResult] = useState<{ cardName: string; miles: number; mpd: number; amount: number } | null>(null);

  const st = SPEND_TYPES[typeIdx];
  const amount = parseFloat(raw);
  const validAmount = !isNaN(amount) && amount > 0;

  const { data, isLoading } = useQuery({
    queryKey: ["userCards", telegramId],
    queryFn: () => getUserCards(telegramId),
  });

  const mutation = useMutation({
    mutationFn: (uc: ApiUserCard) =>
      logTransaction(uc.id, amount, st.spendCategory, st.paymentMethod),
    onSuccess: (res, uc) => {
      qc.invalidateQueries({ queryKey: ["transactions", telegramId] });
      qc.invalidateQueries({ queryKey: ["userCards", telegramId] });
      // Invalidate recommendation cache so caps are fresh on Best Card tab
      qc.invalidateQueries({ queryKey: ["recommend", telegramId] });
      setResult({
        cardName: uc.nickname ?? uc.card.name,
        miles: res.transaction.milesEarned,
        mpd: res.transaction.effectiveMpd,
        amount,
      });
      setRaw("");
    },
  });

  const userCards = data?.userCards ?? [];

  function reset() {
    setResult(null);
    setRaw("");
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.5px" }}>
            +{fmtMiles(result.miles)}
          </div>
          <div style={{ fontSize: 18, color: "var(--success)", fontWeight: 700, marginTop: 4 }}>miles earned</div>
          <div style={{ marginTop: 14, color: "var(--hint)", fontSize: 15, lineHeight: 1.6 }}>
            {result.cardName}<br />
            {fmtSgd(result.amount)} at {fmtMpd(result.mpd)}
          </div>
        </div>
        <button className="btn-primary" style={{ maxWidth: 280 }} onClick={reset}>
          Log another
        </button>
      </div>
    );
  }

  // ── Log form ────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Log spend</div>
        <div className="page-sub">Record a transaction you already made.</div>
      </div>

      {/* Amount */}
      <div className="amount-wrap">
        <span className="amount-prefix">S$</span>
        <input
          className="amount-input"
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={raw}
          onChange={e => setRaw(e.target.value)}
        />
      </div>

      {/* Spend type */}
      <div className="type-row">
        {SPEND_TYPES.map((t, i) => (
          <button
            key={t.label}
            className={`type-pill ${i === typeIdx ? "active" : ""}`}
            onClick={() => setTypeIdx(i)}
          >
            <span className="pill-emoji">{t.emoji}</span>
            <span className="pill-label">{t.label}</span>
          </button>
        ))}
      </div>

      {mutation.error && (
        <div className="error-banner">{(mutation.error as Error).message}</div>
      )}

      {/* Card list — always visible, greyed out until amount is entered */}
      {isLoading ? (
        <div className="card">
          {[1, 2, 3].map(i => (
            <div key={i} className="list-row">
              <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }} />
              <div className="row-main">
                <div className="skeleton" style={{ height: 14, width: "50%", marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 11, width: "30%" }} />
              </div>
            </div>
          ))}
        </div>
      ) : userCards.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">💳</div>
          <p>No cards in wallet.<br />Add cards from My Cards.</p>
        </div>
      ) : (
        <>
          {validAmount && (
            <div className="hint-text" style={{ marginBottom: 10 }}>
              Which card did you use for {fmtSgd(amount)} {st.label.toLowerCase()}?
            </div>
          )}
          {!validAmount && (
            <div className="hint-text" style={{ marginBottom: 10 }}>
              Enter an amount, then tap the card you used.
            </div>
          )}
          <div className="card">
            {userCards.map(uc => (
              <CardRow
                key={uc.id}
                uc={uc}
                disabled={!validAmount || mutation.isPending}
                isLogging={mutation.isPending && mutation.variables?.id === uc.id}
                onTap={() => mutation.mutate(uc)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CardRow({ uc, disabled, isLogging, onTap }: {
  uc: ApiUserCard;
  disabled: boolean;
  isLogging: boolean;
  onTap: () => void;
}) {
  const name = uc.nickname ?? uc.card.name;

  return (
    <div
      className="list-row"
      style={{
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : isLogging ? 0.6 : 1,
        transition: "opacity 0.15s",
      }}
      onClick={disabled ? undefined : onTap}
    >
      <div
        className="bank-dot"
        style={{ background: bankGradient(uc.card.bank), color: bankTextColor(uc.card.bank) }}
      >
        {uc.card.bank.slice(0, 2)}
      </div>
      <div className="row-main">
        <div className="row-title">{name}</div>
        <div className="row-sub">{uc.card.bank} · {uc.card.fullName}</div>
      </div>
      <div style={{ color: isLogging ? "var(--hint)" : "var(--brand)", fontSize: 20, fontWeight: 300 }}>
        {isLogging ? "…" : "›"}
      </div>
    </div>
  );
}
