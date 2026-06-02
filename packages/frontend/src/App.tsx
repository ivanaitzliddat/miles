import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTelegram } from "./hooks/useTelegram";
import { getOrCreateUser } from "./api/client";

import Dashboard from "./pages/Dashboard";
import Recommend from "./pages/Recommend";
import LogSpend from "./pages/LogSpend";
import MyCards from "./pages/MyCards";

type Tab = "home" | "recommend" | "log" | "cards";

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const { user } = useTelegram();

  const { data, isLoading, error } = useQuery({
    queryKey: ["user", user.id],
    queryFn: () => getOrCreateUser(),
    staleTime: Infinity,
    retry: 3,
  });

  if (isLoading) {
    return (
      <div className="app" style={{ justifyContent: "center", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--brand-gradient)" }} className="skeleton" />
        <div className="hint-text">Loading…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="app" style={{ justifyContent: "center", padding: 24 }}>
        <div className="error-banner">
          Could not connect to server. Make sure the backend is running.
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {tab === "home"      && <Dashboard telegramId={user.id} firstName={user.firstName} />}
        {tab === "recommend" && <Recommend  telegramId={user.id} />}
        {tab === "log"       && <LogSpend   telegramId={user.id} />}
        {tab === "cards"     && <MyCards    telegramId={user.id} />}
      </div>

      <nav className="bottom-nav">
        <NavTab id="home"      label="Home"      active={tab === "home"}      onClick={setTab}><HomeIcon /></NavTab>
        <NavTab id="recommend" label="Best Card" active={tab === "recommend"} onClick={setTab}><StarIcon /></NavTab>
        <NavTab id="log"       label="Log"       active={tab === "log"}       onClick={setTab}><PlusIcon /></NavTab>
        <NavTab id="cards"     label="My Cards"  active={tab === "cards"}     onClick={setTab}><WalletIcon /></NavTab>
      </nav>
    </div>
  );
}

function NavTab({ id, label, active, onClick, children }: {
  id: Tab; label: string; active: boolean;
  onClick: (id: Tab) => void; children: React.ReactNode;
}) {
  return (
    <button className={`nav-tab ${active ? "active" : ""}`} onClick={() => onClick(id)}>
      {children}
      {label}
    </button>
  );
}

function HomeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>;
}
function StarIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
}
function PlusIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
}
function WalletIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12a2 2 0 000 4h4v-4h-4z"/></svg>;
}
