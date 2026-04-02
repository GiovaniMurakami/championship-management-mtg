import { SolicitarResetSenha } from "../../../src/casosDeUso/usuario/solicitarResetSenha";
import {
    criarMockUsuarioGateway,
    criarMockResetSenhaGateway,
    criarMockEmailGateway,
} from "../../mocks/gateways";
import { Usuario } from "../../../src/dominio/entidade/usuario";

describe("SolicitarResetSenha", () => {
    it("deve retornar resposta genérica se o email não estiver cadastrado", async () => {
        const usuarioGateway = criarMockUsuarioGateway();
        const resetSenhaGateway = criarMockResetSenhaGateway();
        const emailGateway = criarMockEmailGateway();
        const uc = SolicitarResetSenha.criar(usuarioGateway, resetSenhaGateway, emailGateway);

        const resultado = await uc.executar({ email: "naoexiste@email.com" });

        expect(resultado.mensagem).toBeDefined();
        expect(emailGateway.enviar).not.toHaveBeenCalled();
        expect(resetSenhaGateway.salvar).not.toHaveBeenCalled();
    });

    it("deve gerar token e enviar email se o usuário existir", async () => {
        const usuario = new Usuario({
            id: "user-1",
            nome: "João",
            email: "joao@email.com",
            senha: "hashed",
        });
        const usuarioGateway = criarMockUsuarioGateway({
            buscarPorEmail: jest.fn().mockResolvedValue(usuario),
        });
        const resetSenhaGateway = criarMockResetSenhaGateway();
        const emailGateway = criarMockEmailGateway();
        const uc = SolicitarResetSenha.criar(usuarioGateway, resetSenhaGateway, emailGateway);

        const resultado = await uc.executar({ email: "joao@email.com" });

        expect(resultado.mensagem).toBeDefined();
        expect(resetSenhaGateway.excluirPorUsuario).toHaveBeenCalledWith("user-1");
        expect(resetSenhaGateway.salvar).toHaveBeenCalledTimes(1);
        const dadosSalvos = (resetSenhaGateway.salvar as jest.Mock).mock.calls[0][0];
        expect(dadosSalvos.token).toHaveLength(64); // 32 bytes hex = 64 chars
        expect(dadosSalvos.usuarioId).toBe("user-1");
        expect(dadosSalvos.expiresAt).toBeInstanceOf(Date);
        expect(emailGateway.enviar).toHaveBeenCalledWith(
            expect.objectContaining({ para: "joao@email.com" })
        );
    });

    it("deve retornar a mesma resposta genérica independente de o email existir (segurança)", async () => {
        const usuario = new Usuario({
            id: "user-1",
            nome: "João",
            email: "joao@email.com",
            senha: "hashed",
        });
        const gatewayComUsuario = criarMockUsuarioGateway({
            buscarPorEmail: jest.fn().mockResolvedValue(usuario),
        });
        const gatewaySemUsuario = criarMockUsuarioGateway();
        const resetGateway = criarMockResetSenhaGateway();
        const emailGateway = criarMockEmailGateway();

        const ucComUsuario = SolicitarResetSenha.criar(gatewayComUsuario, resetGateway, emailGateway);
        const ucSemUsuario = SolicitarResetSenha.criar(gatewaySemUsuario, criarMockResetSenhaGateway(), criarMockEmailGateway());

        const respostaComUsuario = await ucComUsuario.executar({ email: "joao@email.com" });
        const respostaSemUsuario = await ucSemUsuario.executar({ email: "naoexiste@email.com" });

        expect(respostaComUsuario.mensagem).toBe(respostaSemUsuario.mensagem);
    });

    it("deve expirar o token em até 1 hora", async () => {
        const usuario = new Usuario({
            id: "user-1",
            nome: "João",
            email: "joao@email.com",
            senha: "hashed",
        });
        const usuarioGateway = criarMockUsuarioGateway({
            buscarPorEmail: jest.fn().mockResolvedValue(usuario),
        });
        const resetSenhaGateway = criarMockResetSenhaGateway();
        const emailGateway = criarMockEmailGateway();
        const uc = SolicitarResetSenha.criar(usuarioGateway, resetSenhaGateway, emailGateway);

        const antes = Date.now();
        await uc.executar({ email: "joao@email.com" });
        const depois = Date.now();

        const dadosSalvos = (resetSenhaGateway.salvar as jest.Mock).mock.calls[0][0];
        const expiracaoMs = dadosSalvos.expiresAt.getTime();
        expect(expiracaoMs).toBeGreaterThanOrEqual(antes + 60 * 60 * 1000 - 100);
        expect(expiracaoMs).toBeLessThanOrEqual(depois + 60 * 60 * 1000 + 100);
    });
});
