import { RefreshToken } from "../../../src/casosDeUso/usuario/refreshToken";
import { criarMockUsuarioGateway, criarMockRefreshTokenGateway } from "../../mocks/gateways";
import { Usuario } from "../../../src/dominio/entidade/usuario";

jest.mock("../../../src/helpers/jwt", () => ({
    signToken: jest.fn().mockReturnValue("novo_token"),
}));

import { signToken } from "../../../src/helpers/jwt";

describe("RefreshToken", () => {
    const usuarioExistente = new Usuario({
        id: "user-1",
        nome: "João",
        email: "joao@email.com",
        senha: "hashed",
        role: "user",
    });

    it("deve retornar novo token quando refresh token é válido", async () => {
        const gateway = criarMockUsuarioGateway({
            buscarPorId: jest.fn().mockResolvedValue(usuarioExistente),
        });
        const refreshTokenGw = criarMockRefreshTokenGateway({
            consumir: jest.fn().mockResolvedValue({
                token: "old-refresh", usuarioId: "user-1", expiresAt: new Date(Date.now() + 86400000),
            }),
        });
        const uc = RefreshToken.criar(gateway, refreshTokenGw);

        const resultado = await uc.executar({ refreshToken: "old-refresh" });

        expect(resultado.token).toBe("novo_token");
        expect(resultado.refreshToken).toBeDefined();
        expect(resultado.refreshToken).not.toBe("old-refresh");
        expect(refreshTokenGw.salvar).toHaveBeenCalledWith(expect.objectContaining({
            usuarioId: "user-1",
        }));
    });

    it("deve incluir role no payload do novo token", async () => {
        const gateway = criarMockUsuarioGateway({
            buscarPorId: jest.fn().mockResolvedValue(usuarioExistente),
        });
        const refreshTokenGw = criarMockRefreshTokenGateway({
            consumir: jest.fn().mockResolvedValue({
                token: "old-refresh", usuarioId: "user-1", expiresAt: new Date(Date.now() + 86400000),
            }),
        });
        const uc = RefreshToken.criar(gateway, refreshTokenGw);

        await uc.executar({ refreshToken: "old-refresh" });

        expect(signToken).toHaveBeenCalledWith(
            expect.objectContaining({ role: "user" }),
            "30m"
        );
    });

    it("deve consumir atomicamente o refresh token antigo", async () => {
        const consumir = jest.fn().mockResolvedValue({
            token: "old-refresh", usuarioId: "user-1", expiresAt: new Date(Date.now() + 86400000),
        });
        const gateway = criarMockUsuarioGateway({
            buscarPorId: jest.fn().mockResolvedValue(usuarioExistente),
        });
        const refreshTokenGw = criarMockRefreshTokenGateway({ consumir });
        const uc = RefreshToken.criar(gateway, refreshTokenGw);

        await uc.executar({ refreshToken: "old-refresh" });

        expect(consumir).toHaveBeenCalledWith("old-refresh");
    });

    it("deve lançar erro 401 se refresh token inválido ou expirado", async () => {
        const gateway = criarMockUsuarioGateway();
        const refreshTokenGw = criarMockRefreshTokenGateway();
        const uc = RefreshToken.criar(gateway, refreshTokenGw);

        await expect(
            uc.executar({ refreshToken: "inexistente" })
        ).rejects.toMatchObject({ status: 401 });
    });

    it("deve lançar erro 401 se usuário não existir", async () => {
        const gateway = criarMockUsuarioGateway();
        const refreshTokenGw = criarMockRefreshTokenGateway({
            consumir: jest.fn().mockResolvedValue({
                token: "old-refresh", usuarioId: "inexistente", expiresAt: new Date(Date.now() + 86400000),
            }),
        });
        const uc = RefreshToken.criar(gateway, refreshTokenGw);

        await expect(
            uc.executar({ refreshToken: "old-refresh" })
        ).rejects.toMatchObject({ status: 401 });
    });

    it("deve lançar erro 500 se signToken retornar null", async () => {
        (signToken as jest.Mock).mockReturnValueOnce(null);
        const gateway = criarMockUsuarioGateway({
            buscarPorId: jest.fn().mockResolvedValue(usuarioExistente),
        });
        const refreshTokenGw = criarMockRefreshTokenGateway({
            consumir: jest.fn().mockResolvedValue({
                token: "old-refresh", usuarioId: "user-1", expiresAt: new Date(Date.now() + 86400000),
            }),
        });
        const uc = RefreshToken.criar(gateway, refreshTokenGw);

        await expect(
            uc.executar({ refreshToken: "old-refresh" })
        ).rejects.toMatchObject({ status: 500 });
    });

    it("rejeita refresh de conta excluída", async () => {
        const excluido = new Usuario({
            ...usuarioExistente,
            excluido: true,
            excluidoEm: new Date(),
        });
        const gateway = criarMockUsuarioGateway({
            buscarPorId: jest.fn().mockResolvedValue(excluido),
        });
        const refreshTokenGw = criarMockRefreshTokenGateway({
            consumir: jest.fn().mockResolvedValue({
                token: "old-refresh", usuarioId: "user-1", expiresAt: new Date(Date.now() + 86400000),
            }),
        });
        const uc = RefreshToken.criar(gateway, refreshTokenGw);

        await expect(
            uc.executar({ refreshToken: "old-refresh" }),
        ).rejects.toMatchObject({
            message: expect.stringMatching(/excluída/i),
            status: 401,
        });
    });
});
