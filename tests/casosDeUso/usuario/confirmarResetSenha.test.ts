import { ConfirmarResetSenha } from "../../../src/casosDeUso/usuario/confirmarResetSenha";
import { criarMockUsuarioGateway, criarMockResetSenhaGateway } from "../../mocks/gateways";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { ErroPersonalizado } from "../../../src/helpers/error/ErroPersonalizado";

jest.mock("bcryptjs", () => ({
    hash: jest.fn().mockResolvedValue("nova_senha_hashed"),
}));

const TOKEN_VALIDO = "token-valido-abc123";

function criarDadosToken(overrides: Partial<{ token: string; usuarioId: string; expiresAt: Date }> = {}) {
    return {
        token: TOKEN_VALIDO,
        usuarioId: "user-1",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        ...overrides,
    };
}

describe("ConfirmarResetSenha", () => {
    it("deve redefinir a senha com token válido", async () => {
        const usuario = new Usuario({ id: "user-1", nome: "João", email: "joao@email.com", senha: "antiga" });
        const usuarioGateway = criarMockUsuarioGateway({
            buscarPorId: jest.fn().mockResolvedValue(usuario),
        });
        const resetSenhaGateway = criarMockResetSenhaGateway({
            buscarPorToken: jest.fn().mockResolvedValue(criarDadosToken()),
        });
        const uc = ConfirmarResetSenha.criar(usuarioGateway, resetSenhaGateway);

        const resultado = await uc.executar({ token: TOKEN_VALIDO, novaSenha: "novaSenha123" });

        expect(resultado.mensagem).toBeDefined();
        expect(usuarioGateway.atualizar).toHaveBeenCalledTimes(1);
        const usuarioAtualizado = (usuarioGateway.atualizar as jest.Mock).mock.calls[0][0] as Usuario;
        expect(usuarioAtualizado.senha).toBe("nova_senha_hashed");
        expect(resetSenhaGateway.excluirPorToken).toHaveBeenCalledWith(TOKEN_VALIDO);
    });

    it("deve lançar erro se o token não existir", async () => {
        const usuarioGateway = criarMockUsuarioGateway();
        const resetSenhaGateway = criarMockResetSenhaGateway();
        const uc = ConfirmarResetSenha.criar(usuarioGateway, resetSenhaGateway);

        await expect(
            uc.executar({ token: "token-inexistente", novaSenha: "novaSenha123" })
        ).rejects.toBeInstanceOf(ErroPersonalizado);

        await expect(
            uc.executar({ token: "token-inexistente", novaSenha: "novaSenha123" })
        ).rejects.toMatchObject({ status: 400 });

        expect(usuarioGateway.atualizar).not.toHaveBeenCalled();
    });

    it("deve lançar erro se o token estiver expirado", async () => {
        const usuarioGateway = criarMockUsuarioGateway();
        const resetSenhaGateway = criarMockResetSenhaGateway({
            buscarPorToken: jest.fn().mockResolvedValue(
                criarDadosToken({ expiresAt: new Date(Date.now() - 1000) })
            ),
        });
        const uc = ConfirmarResetSenha.criar(usuarioGateway, resetSenhaGateway);

        await expect(
            uc.executar({ token: TOKEN_VALIDO, novaSenha: "novaSenha123" })
        ).rejects.toBeInstanceOf(ErroPersonalizado);

        await expect(
            uc.executar({ token: TOKEN_VALIDO, novaSenha: "novaSenha123" })
        ).rejects.toMatchObject({ status: 400 });

        expect(usuarioGateway.atualizar).not.toHaveBeenCalled();
    });

    it("deve lançar erro se a nova senha tiver menos de 8 caracteres", async () => {
        const usuarioGateway = criarMockUsuarioGateway();
        const resetSenhaGateway = criarMockResetSenhaGateway({
            buscarPorToken: jest.fn().mockResolvedValue(criarDadosToken()),
        });
        const uc = ConfirmarResetSenha.criar(usuarioGateway, resetSenhaGateway);

        await expect(
            uc.executar({ token: TOKEN_VALIDO, novaSenha: "curta" })
        ).rejects.toBeInstanceOf(ErroPersonalizado);

        await expect(
            uc.executar({ token: TOKEN_VALIDO, novaSenha: "curta" })
        ).rejects.toMatchObject({ status: 400 });

        expect(usuarioGateway.atualizar).not.toHaveBeenCalled();
    });

    it("deve excluir o token após uso", async () => {
        const usuario = new Usuario({ id: "user-1", nome: "João", email: "joao@email.com", senha: "antiga" });
        const usuarioGateway = criarMockUsuarioGateway({
            buscarPorId: jest.fn().mockResolvedValue(usuario),
        });
        const resetSenhaGateway = criarMockResetSenhaGateway({
            buscarPorToken: jest.fn().mockResolvedValue(criarDadosToken()),
        });
        const uc = ConfirmarResetSenha.criar(usuarioGateway, resetSenhaGateway);

        await uc.executar({ token: TOKEN_VALIDO, novaSenha: "novaSenha123" });

        expect(resetSenhaGateway.excluirPorToken).toHaveBeenCalledWith(TOKEN_VALIDO);
    });
});
