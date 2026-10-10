import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { requireAdmin } from "./adminAuth.js";
import { AppError } from "./errorHandler.js";
import { telegramAuth, verifyInitData } from "./telegramAuth.js";

const oldAdminId = process.env.ADMIN_TELEGRAM_ID;

afterEach(() => {
  if (oldAdminId === undefined) delete process.env.ADMIN_TELEGRAM_ID;
  else process.env.ADMIN_TELEGRAM_ID = oldAdminId;
});

function checkAdmin(userId?: number) {
  const req = { telegramUser: userId ? { id: userId, firstName: "Test" } : undefined } as Request;
  const next = vi.fn() as unknown as NextFunction;
  requireAdmin(req, {} as Response, next);
  return next as unknown as ReturnType<typeof vi.fn>;
}

function signedInitData(authDate: number) {
  const token = "123456:test-token";
  const params = new URLSearchParams({
    auth_date: String(authDate),
    user: JSON.stringify({ id: 42, first_name: "Test" }),
  });
  const checkString = [...params.entries()].map(([key, value]) => `${key}=${value}`).sort().join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  params.set("hash", createHmac("sha256", secret).update(checkString).digest("hex"));
  return { token, data: params.toString() };
}

describe("admin API authorization", () => {
  it("fails closed without an administrator ID", () => {
    delete process.env.ADMIN_TELEGRAM_ID;
    expect(checkAdmin(42)).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });

  it("rejects a normal authenticated user", () => {
    process.env.ADMIN_TELEGRAM_ID = "42";
    expect(checkAdmin(7)).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it("allows only the configured administrator", () => {
    process.env.ADMIN_TELEGRAM_ID = "42";
    expect(checkAdmin(42)).toHaveBeenCalledWith();
  });
});

describe("Telegram initData expiry", () => {
  it("accepts a correctly signed current timestamp", () => {
    const signed = signedInitData(Math.floor(Date.now() / 1000));
    expect(verifyInitData(signed.data, signed.token).id).toBe(42);
  });

  it("rejects a correctly signed timestamp in the future", () => {
    const signed = signedInitData(Math.floor(Date.now() / 1000) + 3600);
    expect(() => verifyInitData(signed.data, signed.token)).toThrow(AppError);
  });
});

describe("development Telegram authentication", () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldBotToken = process.env.TELEGRAM_BOT_TOKEN;

  afterEach(() => {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldNodeEnv;
    if (oldBotToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = oldBotToken;
  });

  it("rejects supplied initData with an invalid signature", () => {
    process.env.NODE_ENV = "development";
    process.env.TELEGRAM_BOT_TOKEN = "123456:test-token";
    const req = { headers: { "x-telegram-init-data": "auth_date=1&hash=invalid" } } as unknown as Request;
    const next = vi.fn() as unknown as NextFunction;
    telegramAuth(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    expect(req.telegramUser).toBeUndefined();
  });
});
