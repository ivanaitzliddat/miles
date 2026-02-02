import React from "react";
import ReactDOM from "react-dom/client";
import { CARD_DEFINITIONS } from "@miles-tracker/shared";

/**
 * Placeholder app to verify the frontend can import from the shared package.
 * This will be replaced with the full app in Module 6.
 */
function App() {
  return (
    <div style={{ padding: "20px", fontFamily: "system-ui" }}>
      <h1>Miles Tracker</h1>
      <p>Frontend setup complete! Loaded {CARD_DEFINITIONS.length} cards from shared package:</p>
      <ul>
        {CARD_DEFINITIONS.map((card) => (
          <li key={card.slug}>
            <strong>{card.fullName}</strong> — {card.earningRates[0].milesPerDollar} mpd local
          </li>
        ))}
      </ul>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
