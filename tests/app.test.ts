jest.mock("../src/infra/api/express/api.express", () => ({
    ApiExpress: {
        criar: jest.fn(),
    },
}));

jest.mock("../src/infra/ably/notificacaoAbly", () => ({
    NotificacaoAbly: {
        iniciar: jest.fn(),
    },
}));

jest.mock("../src/middlewares/express/autenticarJwt", () => ({
    inicializarAutenticarJwt: jest.fn(),
}));

jest.mock("../src/composicao/repositorios", () => ({
    criarRepositorios: jest.fn().mockReturnValue({ tokenBlacklist: { existe: jest.fn() } }),
}));

jest.mock("../src/composicao/servicos", () => ({
    criarServicos: jest.fn().mockReturnValue({}),
}));

jest.mock("../src/composicao/casos", () => ({
    criarCasosDeUso: jest.fn().mockReturnValue({}),
}));

jest.mock("../src/composicao/rotas", () => ({
    criarRotas: jest.fn().mockReturnValue([]),
}));

describe("app bootstrap", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        jest.resetModules();
        process.env = {
            ...originalEnv,
            MONGODB_URI: "mongodb://localhost/teste",
            JWT_SECRET: "segredo-teste",
        };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it("monta a aplicação sem abrir listen no bootstrap", async () => {
        const expressApp = { listen: jest.fn() };
        const { ApiExpress } = require("../src/infra/api/express/api.express");
        ApiExpress.criar.mockReturnValue({
            retornarAplicacao: jest.fn().mockReturnValue(expressApp),
        });

        const { app } = require("../src/app") as typeof import("../src/app");
        const { inicializarAutenticarJwt } = require("../src/middlewares/express/autenticarJwt");

        const resultado = app();

        expect(resultado).toBe(expressApp);
        expect(expressApp.listen).not.toHaveBeenCalled();
        expect(inicializarAutenticarJwt).toHaveBeenCalledTimes(1);
    });

    it("inicializa dependências de processo apenas uma vez", async () => {
        process.env.ABLY_API_KEY = "ably-key";
        const { NotificacaoAbly } = require("../src/infra/ably/notificacaoAbly");
        const { inicializarDependenciasDeProcesso } = require("../src/app") as typeof import("../src/app");

        inicializarDependenciasDeProcesso();
        inicializarDependenciasDeProcesso();

        expect(NotificacaoAbly.iniciar).toHaveBeenCalledTimes(1);
    });
});
