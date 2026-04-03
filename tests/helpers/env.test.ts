import { getCorsOrigin, getFrontendUrl, isExecucaoLocal } from "../../src/helpers/env";

describe("env helpers", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env = { ...originalEnv };
        delete process.env.IS_LOCAL;
        delete process.env.FRONTEND_URL;
        delete process.env.CORS_ORIGIN;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it("identifica execução local quando IS_LOCAL=true", () => {
        process.env.IS_LOCAL = "true";

        expect(isExecucaoLocal()).toBe(true);
        expect(getFrontendUrl()).toBe("http://localhost:5173");
        expect(getCorsOrigin()).toBe("http://localhost:5173");
    });

    it("usa URLs configuradas quando não está local", () => {
        process.env.IS_LOCAL = "false";
        process.env.FRONTEND_URL = "https://app.exemplo.com";
        process.env.CORS_ORIGIN = "https://web.exemplo.com";

        expect(isExecucaoLocal()).toBe(false);
        expect(getFrontendUrl()).toBe("https://app.exemplo.com");
        expect(getCorsOrigin()).toBe("https://web.exemplo.com");
    });

    it("reaproveita FRONTEND_URL no CORS quando CORS_ORIGIN não foi definido", () => {
        process.env.FRONTEND_URL = "https://app.exemplo.com";

        expect(getCorsOrigin()).toBe("https://app.exemplo.com");
    });
});