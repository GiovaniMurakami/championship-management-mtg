import { CadastrarUsuario } from "../../../src/casosDeUso/usuario/cadastrarUsuario";
import { criarMockUsuarioGateway } from "../../mocks/gateways";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { ErroPersonalizado } from "../../../src/helpers/error/ErroPersonalizado";

jest.mock("bcryptjs", () => ({
    hash: jest.fn().mockResolvedValue("hashed_password"),
}));

describe("CadastrarUsuario", () => {
    it("deve cadastrar um novo usuário com sucesso", async () => {
        const gateway = criarMockUsuarioGateway();
        const uc = CadastrarUsuario.criar(gateway);

        const resultado = await uc.executar({
            nome: "João",
            email: "joao@email.com",
            senha: "senha123",
        });

        expect(resultado.nome).toBe("João");
        expect(resultado.email).toBe("joao@email.com");
        expect(resultado.id).toBeDefined();
        expect(resultado.criadoEm).toBeInstanceOf(Date);
        expect(gateway.salvar).toHaveBeenCalledTimes(1);
    });

    it("deve lançar erro se o e-mail já estiver cadastrado", async () => {
        const gateway = criarMockUsuarioGateway({
            buscarPorEmail: jest.fn().mockResolvedValue(
                new Usuario({ id: "x", nome: "A", email: "joao@email.com", senha: "s" })
            ),
        });
        const uc = CadastrarUsuario.criar(gateway);

        await expect(
            uc.executar({ nome: "João", email: "joao@email.com", senha: "s" })
        ).rejects.toBeInstanceOf(ErroPersonalizado);

        await expect(
            uc.executar({ nome: "João", email: "joao@email.com", senha: "s" })
        ).rejects.toMatchObject({ status: 400 });

        expect(gateway.salvar).not.toHaveBeenCalled();
    });

    it("deve hash da senha antes de salvar", async () => {
        const gateway = criarMockUsuarioGateway();
        const uc = CadastrarUsuario.criar(gateway);

        await uc.executar({ nome: "João", email: "j@e.com", senha: "senha" });

        const chamadas = (gateway.salvar as jest.Mock).mock.calls;
        const usuarioSalvo = chamadas[0][0] as Usuario;
        expect(usuarioSalvo.senha).toBe("hashed_password");
    });
});
