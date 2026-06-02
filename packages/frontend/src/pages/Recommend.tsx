import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRecommendations } from "../api/client";
import type { ApiRecommendation } from "../api/client";
import { fmtMiles, fmtMpd, SPEND_TYPES, MERCHANT_CATEGORIES } from "../utils/format";

interface Props { telegramId: number; }

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Recommend({ telegramId }: Props) {
  const [raw, setRaw]               = useState("");
  const [typeIdx, setTypeIdx]       = useState(1); // default: Online
  const [category, setCategory]     = useState<string | undefined>(undefined);
  const [debounced, setDebounced]   = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timer.current);
    const v = parseFloat(raw);
    if (!isNaN(v) && v > 0) {
      timer.current = setTimeout(() => setDebounced(v), 400);
    } else {
      setDebounced(null);
    }
    return () => clearTimeout(timer.current);
  }, [raw]);

  const st = SPEND_TYPES[typeIdx];

  const { data, isLoading, error } = useQuery({
    queryKey: ["recommend", telegramId, debounced, typeIdx, category],
    queryFn: () => getRecommendations(debounced!, st.spendCategory, st.paymentMethod, category),
    enabled: (debounced ?? 0) > 0,
    staleTime: 10_000,
  });

  const results = data?.recommendations ?? [];

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Best card</div>
        <div className="page-sub">Which card earns the most miles?</div>
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
          autoFocus
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

      {/* Merchant category — optional, but improves accuracy for category-specific cards */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--hint)", marginBottom: 8 }}>
          Category <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional — for category-bonus cards)</span>
        </div>
        <div className="type-row" style={{ flexWrap: "wrap" }}>
          {/* "Any" pill to clear selection */}
          <button
            className={`type-pill ${!category ? "active" : ""}`}
            onClick={() => setCategory(undefined)}
          >
            <span className="pill-emoji">🔀</span>
            <span className="pill-label">Any</span>
          </button>
          {MERCHANT_CATEGORIES.map(c => (
            <button
              key={c.value}
              className={`type-pill ${category === c.value ? "active" : ""}`}
              onClick={() => setCategory(prev => prev === c.value ? undefined : c.value)}
            >
              <span className="pill-emoji">{c.emoji}</span>
              <span className="pill-label">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ASEAN context note — only meaningful for UOB PRVI Miles */}
      {st.spendCategory === "FOREIGN_ASEAN" && (
        <div style={{
          background: "var(--brand-light)",
          borderRadius: "var(--r-sm)",
          padding: "10px 14px",
          marginBottom: 16,
          fontSize: 13,
          color: "var(--brand)",
          lineHeight: 1.5,
        }}>
          💡 <b>ASEAN FCY</b> means spending in foreign currency in Southeast Asia (MYR, THB, IDR, PHP etc.).<br />
          Most cards treat this identically to regular foreign spend. The only card in your wallet that earns a different rate for ASEAN is <b>UOB PRVI Miles</b> (3.0 mpd vs 2.4 mpd).
        </div>
      )}

      {error && <div className="error-banner">{(error as Error).message}</div>}

      {/* Loading skeletons */}
      {isLoading && debounced && (
        <div className="rec-list">
          {[1, 2, 3].map(i => (
            <div key={i} className="rec-row" style={{ cursor: "default" }}>
              <div className="skeleton" style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0 }} />
              <div className="rec-info">
                <div className="skeleton" style={{ height: 14, width: "55%", marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 11, width: "35%" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                <div className="skeleton" style={{ height: 16, width: 52 }} />
                <div className="skeleton" style={{ height: 11, width: 36 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!isLoading && results.length > 0 && (
        <div className="rec-list">
          {results.map((r, i) => (
            <RecRow key={r.userCardId} rec={r} rank={i} amount={debounced ?? 0} />
          ))}
        </div>
      )}

      {!isLoading && results.length === 0 && debounced && (
        <div className="empty">
          <div className="empty-icon">💳</div>
          <p>No cards in wallet yet.<br />Add cards from My Cards.</p>
        </div>
      )}

      {!raw && (
        <div className="hint-text" style={{ marginTop: 8 }}>
          Enter an amount to see ranked recommendations.
        </div>
      )}
    </div>
  );
}

function RecRow({ rec, rank, amount }: { rec: ApiRecommendation; rank: number; amount: number }) {
  const capPartial = rec.capRemaining !== null && rec.capRemaining > 0 && rec.capRemaining < amount;

  return (
    <div className="rec-row" style={{ cursor: "default" }}>
      <div className="rec-rank">{MEDALS[rank] ?? `${rank + 1}`}</div>
      <div className="rec-info">
        <div className="rec-name">{rec.cardName}</div>

        {rec.capExhausted && rec.exhaustedBonusMpd !== null ? (
          <div className="rec-detail">
            <span style={{ textDecoration: "line-through", color: "var(--hint)" }}>
              {fmtMpd(rec.exhaustedBonusMpd)}
            </span>
            {" "}
            <span style={{ color: "var(--danger)", fontWeight: 600 }}>cap reached</span>
            {" · "}
            {fmtMpd(rec.effectiveMpd)} base rate
          </div>
        ) : (
          <div className="rec-detail">{rec.reasoning}</div>
        )}

        {capPartial && !rec.capExhausted && (
          <span className="cap-warn">S${rec.capRemaining?.toFixed(0)} cap left</span>
        )}
      </div>
      <div className="rec-numbers">
        <div className="rec-mpd" style={rec.capExhausted ? { color: "var(--hint)", fontSize: 14 } : undefined}>
          {fmtMpd(rec.effectiveMpd)}
        </div>
        <div className="rec-miles">{fmtMiles(rec.milesEarned)} mi</div>
      </div>
    </div>
  );
}
