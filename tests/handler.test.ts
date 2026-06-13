jest.mock("serverless-http", () => jest.fn());
jest.mock("../src/app", () => ({
    app: jest.fn(),
    inicializarDependenciasDeProcesso: jest.fn(),
}));
jest.mock("../src/helpers/jwt", () => ({
    preloadJwtKeys: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../src/infra/ably/notificacaoAbly", () => ({
    NotificacaoAbly: {
        aguardarPublicacoesPendentes: jest.fn().mockResolvedValue(undefined),
    },
}));

describe("handler bootstrap", () => {
    it("aguarda runtime antes de delegar ao serverless-http", async () => {
        const serverless = require("serverless-http") as jest.Mock;
        const appModule = require("../src/app");
        const jwtModule = require("../src/helpers/jwt");
        const { NotificacaoAbly } = require("../src/infra/ably/notificacaoAbly");

        const serverlessHandler = jest.fn().mockResolvedValue({ statusCode: 200 });
        serverless.mockReturnValue(serverlessHandler);
        appModule.app.mockReturnValue({});

        const { handler } = require("../src/handler") as typeof import("../src/handler");
        const resposta = await handler({ path: "/health" }, {});

        expect(jwtModule.preloadJwtKeys).toHaveBeenCalledTimes(1);
        expect(appModule.inicializarDependenciasDeProcesso).toHaveBeenCalledTimes(1);
        expect(serverlessHandler).toHaveBeenCalledWith({ path: "/health" }, {});
        expect(NotificacaoAbly.aguardarPublicacoesPendentes).toHaveBeenCalledTimes(1);
        expect(resposta).toEqual({ statusCode: 200 });
    });
});
