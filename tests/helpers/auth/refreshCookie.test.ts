import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  lerRefreshCookie,
  refreshCookieOptions,
  setRefreshCookie,
} from "../../../src/helpers/auth/refreshCookie";

describe("refreshCookie", () => {
  it("lê o cookie pelo nome esperado", () => {
    expect(lerRefreshCookie({ [REFRESH_COOKIE_NAME]: "abc" })).toBe("abc");
    expect(lerRefreshCookie({})).toBe("");
    expect(lerRefreshCookie(null)).toBe("");
  });

  it("seta e limpa cookie HttpOnly com SameSite Lax", () => {
    const res = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as any;

    setRefreshCookie(res, "refresh-1");
    expect(res.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      "refresh-1",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      }),
    );

    clearRefreshCookie(res);
    expect(res.clearCookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
    );
  });

  it("expõe maxAge de 7 dias", () => {
    expect(refreshCookieOptions().maxAge).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
