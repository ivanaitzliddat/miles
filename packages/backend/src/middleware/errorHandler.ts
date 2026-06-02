/**
 * Global error handler — must be registered last in Express.
 *
 * Security: never leaks stack traces or internal details in production.
 * In development, full errors are logged to console for debugging.
 */

import type { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    console.error(`[${req.method}] ${req.path}`, err);
  }

  if (err.name === "AppError") {
    const appErr = err as AppError;
    res.status(appErr.statusCode).json({ error: appErr.message });
    return;
  }

  // Validation errors from Zod
  if (err.name === "ZodError") {
    res.status(400).json({
      error: "Invalid request data",
      ...(isDev && { details: JSON.parse(err.message) }),
    });
    return;
  }

  // Unknown errors — never expose internals in production
  res.status(500).json({
    error: isDev ? err.message : "An unexpected error occurred.",
  });
}
