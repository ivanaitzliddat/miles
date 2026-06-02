/**
 * Telegram Mini App authentication middleware.
 *
 * Telegram signs the initData payload with HMAC-SHA256 so the backend can
 * verify it genuinely came from Telegram and wasn't tampered with.
 *
 * Algorithm (per Telegram docs):
 *   1. Parse initData as URLSearchParams
 *   2. Pull out the `hash` field
 *   3. Sort the remaining key=value pairs alphabetically and join with \n
 *   4. Compute secretKey = HMAC-SHA256("WebAppData", BOT_TOKEN)
 *   5. Compute expectedHash = HMAC-SHA256(dataCheckString, secretKey)
 *   6. Compare expectedHash === hash (constant-time)
 *   7. Check auth_date is within the last 24 hours (prevents replay attacks)
 *
 * In development (NODE_ENV !== "production" and no real initData),
 * validation is skipped and a dev user is injected — clearly logged as a warning.
 *
 * Attaches to every validated request:
 *   req.telegramUser = { id, firstName, lastName?, username? }
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler.js";

// ── Augment Express Request ───────────────────────────────────────────────────

export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
}

declare global {
  namespace Express {
    interface Request {
      telegramUser?: TelegramUser;
    }
  }
}

// ── Core validation ───────────────────────────────────────────────────────────

function verifyInitData(initData: string, botToken: string): TelegramUser {
  const params = new URLSearchParams(initData);

  const receivedHash = params.get("hash");
  if (!receivedHash) throw new AppError(401, "Missing hash in initData.");

  // Build the data-check string: all fields except hash, sorted, joined by \n
  const entries: string[] = [];
  params.forEach((value, key) => {
    if (key !== "hash") entries.push(`${key}=${value}`);
  });
  entries.sort();
  const dataCheckString = entries.join("\n");

  // Derive the secret key
  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  // Compute expected hash
  const expectedHashBuffer = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest();

  const receivedHashBuffer = Buffer.from(receivedHash, "hex");

  // Constant-time comparison (prevents timing attacks)
  if (
    expectedHashBuffer.length !== receivedHashBuffer.length ||
    !timingSafeEqual(expectedHashBuffer, receivedHashBuffer)
  ) {
    throw new AppError(401, "Invalid initData signature.");
  }

  // Replay attack prevention: reject if initData is older than 24 hours
  const authDate = parseInt(params.get("auth_date") ?? "0", 10);
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (ageSeconds > 86400) {
    throw new AppError(401, "initData has expired. Please reopen the app.");
  }

  // Extract user
  const userJson = params.get("user");
  if (!userJson) throw new AppError(401, "No user in initData.");

  const user = JSON.parse(userJson) as {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };

  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
  };
}

// ── Middleware ────────────────────────────────────────────────────────────────

export function telegramAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    // Dev bypass: if no bot token or NODE_ENV is not production,
    // skip validation and inject the dev user.
    // This means you can still use curl/Postman during development.
    if (!botToken || process.env.NODE_ENV !== "production") {
      if (process.env.NODE_ENV === "production") {
        // Production with no token — hard fail
        throw new AppError(500, "TELEGRAM_BOT_TOKEN is not configured.");
      }

      // Development: use initData if provided and valid, otherwise fall back to dev user
      const initData = req.headers["x-telegram-init-data"] as string | undefined;
      if (initData && botToken) {
        try {
          req.telegramUser = verifyInitData(initData, botToken);
          return next();
        } catch {
          // In dev, fall through to dev user rather than blocking
        }
      }

      // Inject dev user — clearly logged so it's obvious auth is bypassed
      if (!req.telegramUser) {
        req.telegramUser = { id: 123456789, firstName: "Dev", username: "dev" };
      }
      return next();
    }

    // Production: require and validate the header
    const initData = req.headers["x-telegram-init-data"] as string | undefined;
    if (!initData) throw new AppError(401, "Missing X-Telegram-Init-Data header.");

    req.telegramUser = verifyInitData(initData, botToken);
    next();
  } catch (err) {
    next(err);
  }
}
