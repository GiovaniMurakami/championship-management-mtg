import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request } from "express";

vi.mock("../../../src/helpers/jwt", () => ({
  verifyToken: vi.fn(),
}));

import { verifyToken } from "../../../src/helpers/jwt";
import { skipRateLimitSeAdmin } from "../../../src/middlewares/express/rateLimiter";

describe("skipRateLimitSeAdmin", () => {
  beforeEach(() => {
    vi.mocked(verifyToken).mockReset();
  });

  it("pula quando req.usuario já é admin", () => {
    const req = { usuario: { role: "admin" }, headers: {} } as Request;
    expect(skipRateLimitSeAdmin(req)).toBe(true);
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it("não pula usuário comum autenticado", () => {
    const req = { usuario: { role: "user" }, headers: {} } as Request;
    expect(skipRateLimitSeAdmin(req)).toBe(false);
  });

  it("pula admin via Bearer token quando usuario ainda não foi setado", () => {
    vi.mocked(verifyToken).mockReturnValue({
      id: "1",
      email: "a@b.c",
      nome: "Admin",
      role: "admin",
    });
    const req = {
      headers: { authorization: "Bearer token-admin" },
    } as Request;
    expect(skipRateLimitSeAdmin(req)).toBe(true);
    expect(verifyToken).toHaveBeenCalledWith("token-admin");
  });

  it("não pula sem token", () => {
    const req = { headers: {} } as Request;
    expect(skipRateLimitSeAdmin(req)).toBe(false);
  });
});
