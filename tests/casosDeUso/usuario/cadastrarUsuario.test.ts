import { CadastrarUsuario } from "../../../src/casosDeUso/usuario/cadastrarUsuario";
import { criarMockUsuarioGateway, criarMockEmailGateway } from "../../mocks/gateways";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { ErroPersonalizado } from "../../../src/helpers/error/ErroPersonalizado";
import { EmailUsuarioJaExisteErro } from "../../../src/dominio/gateway/usuarioGateway";

jest.mock("bcryptjs", () => ({
    hash: jest.fn().mockResolvedValue("hashed_password"),
}));

describe("CadastrarUsuario", () => {
    it("deve cadastrar um novo usuário com sucesso", async () => {
        const gateway = criarMockUsuarioGateway();
        const emailGateway = criarMockEmailGateway();
        const uc = CadastrarUsuario.criar(gateway, emailGateway);

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

    it("deve enviar email de boas-vindas após cadastro", async () => {
        const gateway = criarMockUsuarioGateway();
        const emailGateway = criarMockEmailGateway();
        const uc = CadastrarUsuario.criar(gateway, emailGateway);

        await uc.executar({ nome: "João", email: "joao@email.com", senha: "senha123" });

        expect(emailGateway.enviar).toHaveBeenCalledTimes(1);
        expect(emailGateway.enviar).toHaveBeenCalledWith(
            expect.objectContaining({ para: "joao@email.com" })
        );
    });

    it("deve lançar erro se o e-mail já estiver cadastrado", async () => {
        const gateway = criarMockUsuarioGateway({
            buscarPorEmail: jest.fn().mockResolvedValue(
                new Usuario({ id: "x", nome: "A", email: "joao@email.com", senha: "s" })
            ),
        });
        const emailGateway = criarMockEmailGateway();
        const uc = CadastrarUsuario.criar(gateway, emailGateway);

        await expect(
            uc.executar({ nome: "João", email: "joao@email.com", senha: "s" })
        ).rejects.toBeInstanceOf(ErroPersonalizado);

        await expect(
            uc.executar({ nome: "João", email: "joao@email.com", senha: "s" })
        ).rejects.toMatchObject({ status: 400 });

        expect(gateway.salvar).not.toHaveBeenCalled();
        expect(emailGateway.enviar).not.toHaveBeenCalled();
    });

    it("deve hash da senha antes de salvar", async () => {
        const gateway = criarMockUsuarioGateway();
        const emailGateway = criarMockEmailGateway();
        const uc = CadastrarUsuario.criar(gateway, emailGateway);

        await uc.executar({ nome: "João", email: "j@e.com", senha: "senha" });

        const chamadas = (gateway.salvar as jest.Mock).mock.calls;
        const usuarioSalvo = chamadas[0][0] as Usuario;
        expect(usuarioSalvo.senha).toBe("hashed_password");
    });

    it("deve traduzir conflito atomico de email do repositorio", async () => {
        const gateway = criarMockUsuarioGateway({
            salvar: jest.fn().mockRejectedValue(new EmailUsuarioJaExisteErro()),
        });
        const emailGateway = criarMockEmailGateway();
        const uc = CadastrarUsuario.criar(gateway, emailGateway);

        await expect(
            uc.executar({ nome: "Joao", email: "concorrente@email.com", senha: "senha" })
        ).rejects.toMatchObject({ status: 400 });
        expect(emailGateway.enviar).not.toHaveBeenCalled();
    });

    it("deve preservar falhas inesperadas do repositorio", async () => {
        const falha = new Error("Dynamo indisponivel");
        const gateway = criarMockUsuarioGateway({
            salvar: jest.fn().mockRejectedValue(falha),
        });
        const uc = CadastrarUsuario.criar(gateway, criarMockEmailGateway());

        await expect(
            uc.executar({ nome: "Joao", email: "erro@email.com", senha: "senha" })
        ).rejects.toBe(falha);
    });
});
