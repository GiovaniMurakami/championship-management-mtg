import { CookieOptions, Response } from "express";
import { isExecucaoLocal } from "../env";

/** Nome do cookie HttpOnly do refresh token. */
export const REFRESH_COOKIE_NAME = "cmmtg_rt";

/** Alinhado à expiração do refresh no Dynamo (7 dias). */
export const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: !isExecucaoLocal(),
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  };
}

export function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: !isExecucaoLocal(),
    sameSite: "lax",
    path: "/",
  });
}

export function lerRefreshCookie(cookies: unknown): string {
  if (!cookies || typeof cookies !== "object") return "";
  const valor = (cookies as Record<string, unknown>)[REFRESH_COOKIE_NAME];
  return typeof valor === "string" ? valor.trim() : "";
}
