import { LoginUsuario } from "../../../src/casosDeUso/usuario/loginUsuario";
import { criarMockUsuarioGateway } from "../../mocks/gateways";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { ErroPersonalizado } from "../../../src/helpers/error/ErroPersonalizado";

jest.mock("bcryptjs", () => ({
    compare: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
    sign: jest.fn().mockReturnValue("token_gerado"),
}));

import bcrypt from "bcryptjs";

describe("LoginUsuario", () => {
    const usuarioExistente = new Usuario({
        id: "user-1",
        nome: "João",
        email: "joao@email.com",
        senha: "hashed",
        telefone: "11999",
        nickMTGO: "joaoMTGO",
        nickArena: "joaoArena",
    });

    beforeEach(() => {
        process.env.JWT_SECRET = "test-secret";
    });

    afterEach(() => {
        delete process.env.JWT_SECRET;
    });

    it("deve retornar token e dados do usuário no login com sucesso", async () => {
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        const gateway = criarMockUsuarioGateway({
            buscarPorEmail: jest.fn().mockResolvedValue(usuarioExistente),
        });
        const uc = LoginUsuario.criar(gateway);

        const resultado = await uc.executar({ email: "joao@email.com", senha: "s" });

        expect(resultado.token).toBe("token_gerado");
        expect(resultado.usuario.id).toBe("user-1");
        expect(resultado.usuario.nome).toBe("João");
        expect(resultado.usuario.email).toBe("joao@email.com");
        expect(resultado.usuario.telefone).toBe("11999");
    });

    it("deve lançar erro se o e-mail não for encontrado", async () => {
        const gateway = criarMockUsuarioGateway();
        const uc = LoginUsuario.criar(gateway);

        await expect(
            uc.executar({ email: "naoexiste@e.com", senha: "s" })
        ).rejects.toMatchObject({ status: 401 });
    });

    it("deve lançar erro se a senha for inválida", async () => {
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);
        const gateway = criarMockUsuarioGateway({
            buscarPorEmail: jest.fn().mockResolvedValue(usuarioExistente),
        });
        const uc = LoginUsuario.criar(gateway);

        await expect(
            uc.executar({ email: "joao@email.com", senha: "errada" })
        ).rejects.toMatchObject({ status: 401 });
    });

    it("deve lançar erro se JWT_SECRET não estiver configurado", async () => {
        delete process.env.JWT_SECRET;
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        const gateway = criarMockUsuarioGateway({
            buscarPorEmail: jest.fn().mockResolvedValue(usuarioExistente),
        });
        const uc = LoginUsuario.criar(gateway);

        await expect(
            uc.executar({ email: "joao@email.com", senha: "s" })
        ).rejects.toMatchObject({ status: 500 });
    });
});
