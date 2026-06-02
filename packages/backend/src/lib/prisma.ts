/**
 * Prisma client singleton.
 * Reuses the same instance across the app to avoid exhausting DB connections.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export default prisma;
