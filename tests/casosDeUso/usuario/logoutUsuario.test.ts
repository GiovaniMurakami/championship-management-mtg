import { LogoutUsuario } from "../../../src/casosDeUso/usuario/logoutUsuario";
import { TokenBlacklistGateway } from "../../../src/dominio/gateway/tokenBlacklistGateway";
import { RefreshTokenGateway } from "../../../src/dominio/gateway/refreshTokenGateway";
import jwt from "jsonwebtoken";

function criarMockBlacklist(overrides: Partial<TokenBlacklistGateway> = {}): TokenBlacklistGateway {
    return {
        adicionar: jest.fn(),
        existe: jest.fn().mockResolvedValue(false),
        ...overrides,
    };
}

function criarMockRefreshToken(overrides: Partial<RefreshTokenGateway> = {}): RefreshTokenGateway {
    return {
        salvar: jest.fn(),
        consumir: jest.fn().mockResolvedValue(null),
        excluirPorUsuario: jest.fn(),
        ...overrides,
    };
}

const JWT_SECRET = "test-secret";

describe("LogoutUsuario", () => {
    beforeAll(() => {
        process.env.JWT_SECRET = JWT_SECRET;
    });

    afterAll(() => {
        delete process.env.JWT_SECRET;
    });

    it("adiciona o token ao blacklist e retorna mensagem de sucesso", async () => {
        const token = jwt.sign({ id: "u-1", email: "a@a.com", nome: "User", role: "user" }, JWT_SECRET, { expiresIn: "1h" });
        const blacklist = criarMockBlacklist();
        const refreshToken = criarMockRefreshToken();
        const casoDeUso = LogoutUsuario.criar(blacklist, refreshToken);

        const resultado = await casoDeUso.executar({ token, usuarioId: "u-1" });

        expect(blacklist.adicionar).toHaveBeenCalledWith(token, expect.any(Date));
        expect(refreshToken.excluirPorUsuario).toHaveBeenCalledWith("u-1");
        expect(resultado).toEqual({ mensagem: "Logout realizado com sucesso." });
    });

    it("lanca ErroPersonalizado com 401 para token invalido", async () => {
        const blacklist = criarMockBlacklist();
        const refreshToken = criarMockRefreshToken();
        const casoDeUso = LogoutUsuario.criar(blacklist, refreshToken);

        await expect(casoDeUso.executar({ token: "token-invalido", usuarioId: "u-1" })).rejects.toMatchObject({
            status: 401,
        });
        expect(blacklist.adicionar).not.toHaveBeenCalled();
    });

    it("lanca ErroPersonalizado com 401 quando JWT_SECRET nao configurado", async () => {
        delete process.env.JWT_SECRET;
        const blacklist = criarMockBlacklist();
        const refreshToken = criarMockRefreshToken();
        const casoDeUso = LogoutUsuario.criar(blacklist, refreshToken);

        await expect(casoDeUso.executar({ token: "qualquer", usuarioId: "u-1" })).rejects.toMatchObject({
            status: 401,
        });

        process.env.JWT_SECRET = JWT_SECRET;
    });
});
