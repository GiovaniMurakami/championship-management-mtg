import { LoginUsuario } from "../../../src/casosDeUso/usuario/loginUsuario";
import {
    criarMockUsuarioGateway,
    criarMockLoginAttemptGateway,
    criarMockRefreshTokenGateway,
    criarMockEmailGateway,
    criarMockResetSenhaGateway,
} from "../../mocks/gateways";
import { Usuario } from "../../../src/dominio/entidade/usuario";

jest.mock("bcryptjs", () => ({
    compare: jest.fn(),
}));

jest.mock("../../../src/helpers/jwt", () => ({
    signToken: jest.fn().mockReturnValue("token_gerado"),
}));

jest.mock("../../../src/helpers/env", () => ({
    buildFrontendAppLink: jest.fn((path: string) => `http://localhost:5173${path}`),
    isExecucaoLocal: jest.fn().mockReturnValue(true),
    getCorsOrigin: jest.fn().mockReturnValue("http://localhost:5173"),
}));

import bcrypt from "bcryptjs";

describe("LoginUsuario", () => {
    const usuarioExistente = new Usuario({
        id: "user-1",
        nome: "João",
        email: "joao@email.com",
        senha: "hashed",
        role: "user",
        telefone: "11999",
        nickMTGO: "joaoMTGO",
        nickArena: "joaoArena",
    });

    function criarUC(overrides: {
        usuario?: any;
        loginAttempt?: any;
        refreshToken?: any;
        email?: any;
        resetSenha?: any;
    } = {}) {
        return LoginUsuario.criar(
            overrides.usuario ?? criarMockUsuarioGateway(),
            overrides.loginAttempt ?? criarMockLoginAttemptGateway(),
            overrides.refreshToken ?? criarMockRefreshTokenGateway(),
            overrides.email ?? criarMockEmailGateway(),
            overrides.resetSenha ?? criarMockResetSenhaGateway(),
        );
    }

    it("deve retornar token e dados do usuário no login com sucesso", async () => {
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        const loginAttempt = criarMockLoginAttemptGateway();
        const uc = criarUC({
            usuario: criarMockUsuarioGateway({ buscarPorEmail: jest.fn().mockResolvedValue(usuarioExistente) }),
            loginAttempt,
        });

        const resultado = await uc.executar({ email: "joao@email.com", senha: "s" });

        expect(resultado.token).toBe("token_gerado");
        expect(resultado.refreshToken).toBeDefined();
        expect(resultado.usuario.id).toBe("user-1");
        expect(resultado.usuario.nome).toBe("João");
        expect(resultado.usuario.email).toBe("joao@email.com");
        expect(resultado.usuario.role).toBe("user");
        expect(resultado.usuario.telefone).toBe("11999");
        expect(loginAttempt.resetar).toHaveBeenCalledWith("joao@email.com");
    });

    it("deve incluir role 'admin' no token e resposta quando usuário é admin", async () => {
        const admin = new Usuario({ id: "admin-1", nome: "Admin", email: "admin@email.com", senha: "hashed", role: "admin" });
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        const uc = criarUC({ usuario: criarMockUsuarioGateway({ buscarPorEmail: jest.fn().mockResolvedValue(admin) }) });

        const resultado = await uc.executar({ email: "admin@email.com", senha: "s" });

        expect(resultado.usuario.role).toBe("admin");
    });

    it("deve lançar erro se o e-mail não for encontrado", async () => {
        const loginAttempt = criarMockLoginAttemptGateway();
        const uc = criarUC({ loginAttempt });

        await expect(uc.executar({ email: "naoexiste@e.com", senha: "s" })).rejects.toMatchObject({ status: 401 });

        expect(loginAttempt.registrarFalha).toHaveBeenCalledWith("naoexiste@e.com");
    });

    it("deve lançar erro se a senha for inválida", async () => {
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);
        const loginAttempt = criarMockLoginAttemptGateway();
        const uc = criarUC({
            usuario: criarMockUsuarioGateway({ buscarPorEmail: jest.fn().mockResolvedValue(usuarioExistente) }),
            loginAttempt,
        });

        await expect(uc.executar({ email: "joao@email.com", senha: "errada" })).rejects.toMatchObject({ status: 401 });

        expect(loginAttempt.registrarFalha).toHaveBeenCalledWith("joao@email.com");
    });

    it("deve lançar erro se JWT não estiver configurado (signToken retorna null)", async () => {
        const { signToken } = require("../../../src/helpers/jwt");
        (signToken as jest.Mock).mockReturnValueOnce(null);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        const uc = criarUC({ usuario: criarMockUsuarioGateway({ buscarPorEmail: jest.fn().mockResolvedValue(usuarioExistente) }) });

        await expect(uc.executar({ email: "joao@email.com", senha: "s" })).rejects.toMatchObject({ status: 500 });
    });

    it("deve bloquear login após 5 tentativas falhas", async () => {
        const loginAttempt = criarMockLoginAttemptGateway({ obterFalhas: jest.fn().mockResolvedValue(5) });
        const usuarioGateway = criarMockUsuarioGateway();
        const uc = criarUC({ usuario: usuarioGateway, loginAttempt });

        await expect(uc.executar({ email: "joao@email.com", senha: "s" })).rejects.toMatchObject({ status: 429 });

        expect(usuarioGateway.buscarPorEmail).not.toHaveBeenCalled();
    });

    it("deve permitir login com 4 falhas anteriores", async () => {
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        const loginAttempt = criarMockLoginAttemptGateway({ obterFalhas: jest.fn().mockResolvedValue(4) });
        const uc = criarUC({
            usuario: criarMockUsuarioGateway({ buscarPorEmail: jest.fn().mockResolvedValue(usuarioExistente) }),
            loginAttempt,
        });

        const resultado = await uc.executar({ email: "joao@email.com", senha: "s" });

        expect(resultado.token).toBe("token_gerado");
        expect(loginAttempt.resetar).toHaveBeenCalledWith("joao@email.com");
    });

    it("deve enviar e-mail de bloqueio na 5ª senha incorreta", async () => {
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);
        const emailGateway = criarMockEmailGateway();
        const resetSenhaGateway = criarMockResetSenhaGateway();
        const loginAttempt = criarMockLoginAttemptGateway({ obterFalhas: jest.fn().mockResolvedValue(4) });
        const uc = criarUC({
            usuario: criarMockUsuarioGateway({ buscarPorEmail: jest.fn().mockResolvedValue(usuarioExistente) }),
            loginAttempt,
            email: emailGateway,
            resetSenha: resetSenhaGateway,
        });

        await expect(uc.executar({ email: "joao@email.com", senha: "errada" })).rejects.toMatchObject({ status: 401 });

        expect(resetSenhaGateway.excluirPorUsuario).toHaveBeenCalledWith("user-1");
        expect(resetSenhaGateway.salvar).toHaveBeenCalledWith(
            expect.objectContaining({ usuarioId: "user-1" })
        );
        expect(emailGateway.enviar).toHaveBeenCalledWith(
            expect.objectContaining({ para: "joao@email.com" })
        );
    });

    it("não deve enviar e-mail de bloqueio em falhas anteriores à 5ª", async () => {
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);
        const emailGateway = criarMockEmailGateway();
        const loginAttempt = criarMockLoginAttemptGateway({ obterFalhas: jest.fn().mockResolvedValue(2) });
        const uc = criarUC({
            usuario: criarMockUsuarioGateway({ buscarPorEmail: jest.fn().mockResolvedValue(usuarioExistente) }),
            loginAttempt,
            email: emailGateway,
        });

        await expect(uc.executar({ email: "joao@email.com", senha: "errada" })).rejects.toMatchObject({ status: 401 });

        expect(emailGateway.enviar).not.toHaveBeenCalled();
    });
});
