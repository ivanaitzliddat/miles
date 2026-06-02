import { useQuery } from "@tanstack/react-query";
import { getUserCards, getTransactions } from "../api/client";
import type { ApiUserCard, ApiTransaction } from "../api/client";
import { fmtMiles, fmtMpd, fmtDate } from "../utils/format";
import { bankGradient, bankTextColor } from "../utils/banks";

interface Props { telegramId: number; firstName: string; }

export default function Dashboard({ telegramId, firstName }: Props) {
  const { data: cardsData, isLoading: cl } = useQuery({
    queryKey: ["userCards", telegramId],
    queryFn: () => getUserCards(telegramId),
  });
  const { data: txData, isLoading: tl } = useQuery({
    queryKey: ["transactions", telegramId],
    queryFn: () => getTransactions(telegramId),
  });

  const userCards   = cardsData?.userCards ?? [];
  const transactions = txData?.transactions ?? [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisMonth  = transactions.filter(t => new Date(t.transactionDate) >= monthStart);
  const milesMonth = thisMonth.reduce((s, t) => s + t.milesEarned, 0);
  const milesTotal = transactions.reduce((s, t) => s + t.milesEarned, 0);

  const spendByCard = new Map<number, { miles: number; spend: number }>();
  for (const t of thisMonth) {
    const tx = t as ApiTransaction & { userCardId: number };
    const prev = spendByCard.get(tx.userCardId) ?? { miles: 0, spend: 0 };
    spendByCard.set(tx.userCardId, { miles: prev.miles + t.milesEarned, spend: prev.spend + t.amountSgd });
  }

  const monthLabel = now.toLocaleString("en-SG", { month: "long", year: "numeric" });

  if (cl || tl) {
    return (
      <div className="page">
        <div className="hero-card skeleton" style={{ height: 148, marginBottom: 20 }} />
        <div className="stats-row">
          {[1,2,3].map(i => <div key={i} className="stat-chip skeleton" style={{ height: 58 }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Hero */}
      <div className="hero-card">
        <div className="hero-label">Miles this month · {monthLabel}</div>
        <div className="hero-miles">{fmtMiles(milesMonth)}</div>
        <div className="hero-unit">miles earned</div>
        <div className="hero-sub">
          {fmtMiles(milesTotal)} all time &nbsp;·&nbsp; {transactions.length} transactions
        </div>
      </div>

      {/* Quick stats */}
      <div className="stats-row">
        <div className="stat-chip">
          <div className="stat-chip-value mono">{userCards.length}</div>
          <div className="stat-chip-label">Cards</div>
        </div>
        <div className="stat-chip">
          <div className="stat-chip-value mono">{thisMonth.length}</div>
          <div className="stat-chip-label">Txns this month</div>
        </div>
        <div className="stat-chip">
          <div className="stat-chip-value mono" style={{ fontSize: 14 }}>
            S${thisMonth.reduce((s, t) => s + t.amountSgd, 0).toFixed(0)}
          </div>
          <div className="stat-chip-label">Spent</div>
        </div>
      </div>

      {/* Cards breakdown */}
      {userCards.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">💳</div>
          <p>Add cards from <b>My Cards</b> to start tracking miles.</p>
        </div>
      ) : (
        <div className="section">
          <div className="section-header">
            <span className="section-title">Your cards</span>
          </div>
          <div className="card">
            {userCards.map(uc => (
              <CardRow key={uc.id} uc={uc} stats={spendByCard.get(uc.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <div className="section">
          <div className="section-header">
            <span className="section-title">Recent</span>
          </div>
          <div className="card">
            {transactions.slice(0, 6).map(t => (
              <TxRow key={t.id} tx={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CardRow({ uc, stats }: { uc: ApiUserCard; stats?: { miles: number; spend: number } }) {
  const name = uc.nickname ?? uc.card.name;
  const miles = stats?.miles ?? 0;
  const spend = stats?.spend ?? 0;

  return (
    <div className="list-row">
      <div
        className="bank-dot"
        style={{ background: bankGradient(uc.card.bank), color: bankTextColor(uc.card.bank) }}
      >
        {uc.card.bank.slice(0, 2)}
      </div>
      <div className="row-main">
        <div className="row-title">{name}</div>
        <div className="row-sub">{miles > 0 ? `S$${spend.toFixed(0)} spent` : "No activity this month"}</div>
      </div>
      <div className="row-right">
        <div className="row-value mono" style={{ color: miles > 0 ? "var(--success)" : "var(--hint)" }}>
          {miles > 0 ? `+${fmtMiles(miles)}` : "—"}
        </div>
        <div className="row-hint">miles</div>
      </div>
    </div>
  );
}

function TxRow({ tx }: { tx: ApiTransaction }) {
  const cardName = tx.userCard?.card?.name ?? "Card";
  const typeLabel =
    tx.paymentMethod === "ONLINE"      ? "Online" :
    tx.paymentMethod === "CONTACTLESS" ? "Contactless" :
    tx.spendCategory  === "FOREIGN"    ? "Foreign" :
    tx.spendCategory  === "FOREIGN_ASEAN" ? "ASEAN" : "Local";

  return (
    <div className="list-row">
      <div className="bank-dot" style={{ background: bankGradient(tx.userCard?.card?.bank ?? ""), color: "#fff", fontSize: 10 }}>
        {(tx.userCard?.card?.bank ?? "?").slice(0, 2)}
      </div>
      <div className="row-main">
        <div className="row-title">{cardName}</div>
        <div className="row-sub">{typeLabel} · {fmtDate(tx.transactionDate)}</div>
      </div>
      <div className="row-right">
        <div className="row-value mono" style={{ color: "var(--success)" }}>+{fmtMiles(tx.milesEarned)}</div>
        <div className="row-hint">{fmtMpd(tx.effectiveMpd)}</div>
      </div>
    </div>
  );
}
