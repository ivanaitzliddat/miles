import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler.js";

/** All monitor API operations require the configured Telegram administrator. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const configuredId = process.env.ADMIN_TELEGRAM_ID?.trim();
  if (!req.telegramUser) {
    next(new AppError(401, "Not authenticated."));
    return;
  }
  if (!configuredId || !/^[1-9]\d*$/.test(configuredId)) {
    next(new AppError(503, "Administrator is not configured."));
    return;
  }
  if (String(req.telegramUser.id) !== configuredId) {
    next(new AppError(403, "Administrator access required."));
    return;
  }
  next();
}
