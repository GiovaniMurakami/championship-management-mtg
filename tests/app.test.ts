vi.mock("../src/infra/api/express/api.express", () => ({
    ApiExpress: {
        criar: vi.fn(),
    },
}));

vi.mock("../src/infra/ably/notificacaoAbly", () => ({
    NotificacaoAbly: {
        iniciar: vi.fn(),
    },
}));

vi.mock("../src/middlewares/express/autenticarJwt", () => ({
    inicializarAutenticarJwt: vi.fn(),
}));

vi.mock("../src/composicao/repositorios", () => ({
    criarRepositorios: vi.fn().mockReturnValue({ tokenBlacklist: { existe: vi.fn() } }),
}));

vi.mock("../src/composicao/servicos", () => ({
    criarServicos: vi.fn().mockReturnValue({}),
}));

vi.mock("../src/composicao/casos", () => ({
    criarCasosDeUso: vi.fn().mockReturnValue({}),
}));

vi.mock("../src/composicao/rotas", () => ({
    criarRotas: vi.fn().mockReturnValue([]),
}));

describe("app bootstrap", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.resetModules();
        process.env = {
            ...originalEnv,
            DYNAMODB_DATA_TABLE: "tabela-teste",
            JWT_SECRET: "segredo-teste",
        };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it("monta a aplicação sem abrir listen no bootstrap", async () => {
        const expressApp = { listen: vi.fn() };
        const { ApiExpress } = await import("../src/infra/api/express/api.express");
        (ApiExpress.criar as Mock).mockReturnValue({
            retornarAplicacao: vi.fn().mockReturnValue(expressApp),
        });

        const { app } = await import("../src/app");
        const { inicializarAutenticarJwt } = await import("../src/middlewares/express/autenticarJwt");

        const resultado = app();

        expect(resultado).toBe(expressApp);
        expect(expressApp.listen).not.toHaveBeenCalled();
        expect(inicializarAutenticarJwt).toHaveBeenCalledTimes(1);
    });

    it("inicializa dependências de processo apenas uma vez", async () => {
        process.env.ABLY_API_KEY = "ably-key";
        const { NotificacaoAbly } = await import("../src/infra/ably/notificacaoAbly");
        const { inicializarDependenciasDeProcesso } = await import("../src/app");

        inicializarDependenciasDeProcesso();
        inicializarDependenciasDeProcesso();

        expect(NotificacaoAbly.iniciar).toHaveBeenCalledTimes(1);
    });
});
