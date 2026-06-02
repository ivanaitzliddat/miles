import "dotenv/config";
import express from "express";
import { startBot } from "./bot/bot.js";
import {
  helmetMiddleware,
  corsMiddleware,
  rateLimitMiddleware,
} from "./middleware/security.js";
import { telegramAuth } from "./middleware/telegramAuth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import cardsRouter from "./api/cards.js";
import usersRouter from "./api/users.js";
import transactionsRouter from "./api/transactions.js";
import recommendRouter from "./api/recommend.js";
import cardResearchRouter from "./api/cardResearch.js";
import rateMonitorRouter from "./api/rateMonitor.js";

const app = express();
const PORT = process.env.PORT ?? 3000;

// ── Global middleware (order matters) ────────────────────────────────────────
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(rateLimitMiddleware);
app.use(express.json({ limit: "10kb" })); // reject oversized payloads
app.use(telegramAuth);                    // verify Telegram signature on every request

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/cards", cardsRouter);
app.use("/cards/research", cardResearchRouter);
app.use("/admin/monitor", rateMonitorRouter);
app.use("/users", usersRouter);
app.use("/transactions", transactionsRouter);
app.use("/recommend", recommendRouter);

// 404 handler — must come after all routes
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// ── Global error handler — must be last ──────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV ?? "development"}`);
});

// Start the Telegram bot (long polling, runs alongside Express).
// If TELEGRAM_BOT_TOKEN is not set, this is a no-op — the API still works.
startBot();

export default app;
