import { LoginUsuario } from "../../../src/casosDeUso/usuario/loginUsuario";
import { criarMockUsuarioGateway, criarMockLoginAttemptGateway, criarMockRefreshTokenGateway } from "../../mocks/gateways";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { ErroPersonalizado } from "../../../src/helpers/error/ErroPersonalizado";

jest.mock("bcryptjs", () => ({
    compare: jest.fn(),
}));

jest.mock("../../../src/helpers/jwt", () => ({
    signToken: jest.fn().mockReturnValue("token_gerado"),
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

    it("deve retornar token e dados do usuário no login com sucesso", async () => {
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        const gateway = criarMockUsuarioGateway({
            buscarPorEmail: jest.fn().mockResolvedValue(usuarioExistente),
        });
        const loginAttempt = criarMockLoginAttemptGateway();
        const refreshToken = criarMockRefreshTokenGateway();
        const uc = LoginUsuario.criar(gateway, loginAttempt, refreshToken);

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
        const admin = new Usuario({
            id: "admin-1",
            nome: "Admin",
            email: "admin@email.com",
            senha: "hashed",
            role: "admin",
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        const gateway = criarMockUsuarioGateway({
            buscarPorEmail: jest.fn().mockResolvedValue(admin),
        });
        const loginAttempt = criarMockLoginAttemptGateway();
        const refreshToken = criarMockRefreshTokenGateway();
        const uc = LoginUsuario.criar(gateway, loginAttempt, refreshToken);

        const resultado = await uc.executar({ email: "admin@email.com", senha: "s" });

        expect(resultado.usuario.role).toBe("admin");
    });

    it("deve lançar erro se o e-mail não for encontrado", async () => {
        const gateway = criarMockUsuarioGateway();
        const loginAttempt = criarMockLoginAttemptGateway();
        const uc = LoginUsuario.criar(gateway, loginAttempt, criarMockRefreshTokenGateway());

        await expect(
            uc.executar({ email: "naoexiste@e.com", senha: "s" })
        ).rejects.toMatchObject({ status: 401 });

        expect(loginAttempt.registrarFalha).toHaveBeenCalledWith("naoexiste@e.com");
    });

    it("deve lançar erro se a senha for inválida", async () => {
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);
        const gateway = criarMockUsuarioGateway({
            buscarPorEmail: jest.fn().mockResolvedValue(usuarioExistente),
        });
        const loginAttempt = criarMockLoginAttemptGateway();
        const uc = LoginUsuario.criar(gateway, loginAttempt, criarMockRefreshTokenGateway());

        await expect(
            uc.executar({ email: "joao@email.com", senha: "errada" })
        ).rejects.toMatchObject({ status: 401 });

        expect(loginAttempt.registrarFalha).toHaveBeenCalledWith("joao@email.com");
    });

    it("deve lançar erro se JWT não estiver configurado (signToken retorna null)", async () => {
        const { signToken } = require("../../../src/helpers/jwt");
        (signToken as jest.Mock).mockReturnValueOnce(null);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        const gateway = criarMockUsuarioGateway({
            buscarPorEmail: jest.fn().mockResolvedValue(usuarioExistente),
        });
        const loginAttempt = criarMockLoginAttemptGateway();
        const uc = LoginUsuario.criar(gateway, loginAttempt, criarMockRefreshTokenGateway());

        await expect(
            uc.executar({ email: "joao@email.com", senha: "s" })
        ).rejects.toMatchObject({ status: 500 });
    });

    it("deve bloquear login após 5 tentativas falhas", async () => {
        const gateway = criarMockUsuarioGateway();
        const loginAttempt = criarMockLoginAttemptGateway({
            obterFalhas: jest.fn().mockResolvedValue(5),
        });
        const uc = LoginUsuario.criar(gateway, loginAttempt, criarMockRefreshTokenGateway());

        await expect(
            uc.executar({ email: "joao@email.com", senha: "s" })
        ).rejects.toMatchObject({ status: 429 });

        expect(gateway.buscarPorEmail).not.toHaveBeenCalled();
    });

    it("deve permitir login com 4 falhas anteriores", async () => {
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        const gateway = criarMockUsuarioGateway({
            buscarPorEmail: jest.fn().mockResolvedValue(usuarioExistente),
        });
        const loginAttempt = criarMockLoginAttemptGateway({
            obterFalhas: jest.fn().mockResolvedValue(4),
        });
        const uc = LoginUsuario.criar(gateway, loginAttempt, criarMockRefreshTokenGateway());

        const resultado = await uc.executar({ email: "joao@email.com", senha: "s" });

        expect(resultado.token).toBe("token_gerado");
        expect(loginAttempt.resetar).toHaveBeenCalledWith("joao@email.com");
    });
});
