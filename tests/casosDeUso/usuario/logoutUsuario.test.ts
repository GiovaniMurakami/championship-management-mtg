import { LogoutUsuario } from "../../../src/casosDeUso/usuario/logoutUsuario";
import { TokenBlacklistGateway } from "../../../src/dominio/gateway/tokenBlacklistGateway";
import jwt from "jsonwebtoken";

function criarMockBlacklist(overrides: Partial<TokenBlacklistGateway> = {}): TokenBlacklistGateway {
    return {
        adicionar: jest.fn(),
        existe: jest.fn().mockResolvedValue(false),
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
        const casoDeUso = LogoutUsuario.criar(blacklist);

        const resultado = await casoDeUso.executar({ token });

        expect(blacklist.adicionar).toHaveBeenCalledWith(token, expect.any(Date));
        expect(resultado).toEqual({ mensagem: "Logout realizado com sucesso." });
    });

    it("lanca ErroPersonalizado com 401 para token invalido", async () => {
        const blacklist = criarMockBlacklist();
        const casoDeUso = LogoutUsuario.criar(blacklist);

        await expect(casoDeUso.executar({ token: "token-invalido" })).rejects.toMatchObject({
            status: 401,
        });
        expect(blacklist.adicionar).not.toHaveBeenCalled();
    });

    it("lanca ErroPersonalizado com 500 quando JWT_SECRET nao configurado", async () => {
        delete process.env.JWT_SECRET;
        const blacklist = criarMockBlacklist();
        const casoDeUso = LogoutUsuario.criar(blacklist);

        await expect(casoDeUso.executar({ token: "qualquer" })).rejects.toMatchObject({
            status: 500,
        });

        process.env.JWT_SECRET = JWT_SECRET;
    });
});
