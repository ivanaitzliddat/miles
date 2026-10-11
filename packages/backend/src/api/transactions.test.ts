import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import prisma from "../lib/prisma.js";
import { errorHandler } from "../middleware/errorHandler.js";
import transactionsRouter from "./transactions.js";

vi.mock("../lib/prisma.js", () => ({
  default: { transaction: { findFirst: vi.fn() } },
}));

const findFirst = vi.mocked(prisma.transaction.findFirst);
const app = express();
app.use((req, _res, next) => {
  const id = req.header("x-test-user");
  if (id) req.telegramUser = { id: Number(id), firstName: "Test" };
  next();
});
app.use("/transactions", transactionsRouter);
app.use(errorHandler);

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

beforeEach(() => findFirst.mockReset());

describe("GET /transactions/:id", () => {
  it("requires an authenticated Telegram user", async () => {
    const response = await fetch(`${baseUrl}/transactions/12`);
    expect(response.status).toBe(401);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("filters by the authenticated owner and hides other users' transactions", async () => {
    findFirst.mockResolvedValue(null);

    const response = await fetch(`${baseUrl}/transactions/12`, {
      headers: { "x-test-user": "42" },
    });

    expect(response.status).toBe(404);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 12, user: { telegramId: 42n } },
    }));
  });

  it("returns a transaction owned by the authenticated user", async () => {
    findFirst.mockResolvedValue({ id: 12, userId: 7 } as never);

    const response = await fetch(`${baseUrl}/transactions/12`, {
      headers: { "x-test-user": "42" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ transaction: { id: 12, userId: 7 } });
  });
});
