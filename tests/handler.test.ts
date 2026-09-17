vi.mock("serverless-http", () => ({ default: vi.fn() }));
vi.mock("../src/app", () => ({
    app: vi.fn(),
    inicializarDependenciasDeProcesso: vi.fn(),
}));
vi.mock("../src/helpers/jwt", () => ({
    preloadJwtKeys: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../src/infra/ably/notificacaoAbly", () => ({
    NotificacaoAbly: {
        aguardarPublicacoesPendentes: vi.fn().mockResolvedValue(undefined),
    },
}));

describe("handler bootstrap", () => {
    it("aguarda runtime antes de delegar ao serverless-http", async () => {
        const serverless = (await import("serverless-http")).default as Mock;
        const appModule = await import("../src/app");
        const jwtModule = await import("../src/helpers/jwt");
        const { NotificacaoAbly } = await import("../src/infra/ably/notificacaoAbly");

        const serverlessHandler = vi.fn().mockResolvedValue({ statusCode: 200 });
        serverless.mockReturnValue(serverlessHandler);
        appModule.app.mockReturnValue({});

        const { handler } = await import("../src/handler");
        const resposta = await handler({ path: "/health" }, {});

        expect(jwtModule.preloadJwtKeys).toHaveBeenCalledTimes(1);
        expect(appModule.inicializarDependenciasDeProcesso).toHaveBeenCalledTimes(1);
        expect(serverlessHandler).toHaveBeenCalledWith({ path: "/health" }, {});
        expect(NotificacaoAbly.aguardarPublicacoesPendentes).toHaveBeenCalledTimes(1);
        expect(resposta).toEqual({ statusCode: 200 });
    });
});
