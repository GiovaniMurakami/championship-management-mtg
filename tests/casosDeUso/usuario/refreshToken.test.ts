import { RefreshToken } from "../../../src/casosDeUso/usuario/refreshToken";
import { criarMockUsuarioGateway } from "../../mocks/gateways";
import { Usuario } from "../../../src/dominio/entidade/usuario";

jest.mock("jsonwebtoken", () => ({
    sign: jest.fn().mockReturnValue("novo_token"),
}));

describe("RefreshToken", () => {
    const usuarioExistente = new Usuario({
        id: "user-1",
        nome: "João",
        email: "joao@email.com",
        senha: "hashed",
        role: "user",
    });

    beforeEach(() => {
        process.env.JWT_SECRET = "test-secret";
    });

    afterEach(() => {
        delete process.env.JWT_SECRET;
    });

    it("deve retornar novo token quando usuário existe", async () => {
        const gateway = criarMockUsuarioGateway({
            buscarPorId: jest.fn().mockResolvedValue(usuarioExistente),
        });
        const uc = RefreshToken.criar(gateway);

        const resultado = await uc.executar({ usuarioId: "user-1" });

        expect(resultado.token).toBe("novo_token");
    });

    it("deve incluir role no payload do novo token", async () => {
        const jwt = require("jsonwebtoken");
        const gateway = criarMockUsuarioGateway({
            buscarPorId: jest.fn().mockResolvedValue(usuarioExistente),
        });
        const uc = RefreshToken.criar(gateway);

        await uc.executar({ usuarioId: "user-1" });

        expect(jwt.sign).toHaveBeenCalledWith(
            expect.objectContaining({ role: "user" }),
            "test-secret",
            expect.any(Object)
        );
    });

    it("deve lançar erro 401 se usuário não existir", async () => {
        const gateway = criarMockUsuarioGateway();
        const uc = RefreshToken.criar(gateway);

        await expect(
            uc.executar({ usuarioId: "inexistente" })
        ).rejects.toMatchObject({ status: 401 });
    });

    it("deve lançar erro 500 se JWT_SECRET não configurado", async () => {
        delete process.env.JWT_SECRET;
        const gateway = criarMockUsuarioGateway({
            buscarPorId: jest.fn().mockResolvedValue(usuarioExistente),
        });
        const uc = RefreshToken.criar(gateway);

        await expect(
            uc.executar({ usuarioId: "user-1" })
        ).rejects.toMatchObject({ status: 500 });
    });
});
