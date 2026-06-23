import { AtualizarUsuario } from "../../../src/casosDeUso/usuario/atualizarUsuario";
import { criarMockUsuarioGateway } from "../../mocks/gateways";
import { Usuario } from "../../../src/dominio/entidade/usuario";

describe("AtualizarUsuario", () => {
    const usuarioExistente = new Usuario({
        id: "user-1",
        nome: "João",
        email: "joao@email.com",
        senha: "hash",
        telefone: "11999",
    });

    it("deve atualizar nome do usuário", async () => {
        const gateway = criarMockUsuarioGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...usuarioExistente }),
        });
        const uc = AtualizarUsuario.criar(gateway);

        const resultado = await uc.executar({ id: "user-1", nome: "João Atualizado" });

        expect(resultado.nome).toBe("João Atualizado");
        expect(gateway.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve atualizar telefone, nickMTGO e nickArena", async () => {
        const gateway = criarMockUsuarioGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...usuarioExistente }),
        });
        const uc = AtualizarUsuario.criar(gateway);

        const resultado = await uc.executar({
            id: "user-1",
            telefone: "11888",
            nickMTGO: "novoNick",
            nickArena: "arenaNew",
        });

        expect(resultado.telefone).toBe("11888");
        expect(resultado.nickMTGO).toBe("novoNick");
        expect(resultado.nickArena).toBe("arenaNew");
    });

    it("deve lançar erro se o usuário não for encontrado", async () => {
        const gateway = criarMockUsuarioGateway();
        const uc = AtualizarUsuario.criar(gateway);

        await expect(
            uc.executar({ id: "inexistente" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar erro se o nome for menor que 3 caracteres", async () => {
        const gateway = criarMockUsuarioGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...usuarioExistente }),
        });
        const uc = AtualizarUsuario.criar(gateway);

        await expect(
            uc.executar({ id: "user-1", nome: "ab" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve limpar campo opcional com string vazia", async () => {
        const gateway = criarMockUsuarioGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...usuarioExistente }),
        });
        const uc = AtualizarUsuario.criar(gateway);

        const resultado = await uc.executar({ id: "user-1", telefone: "" });
        expect(resultado.telefone).toBeUndefined();
    });

    it("deve limpar nickMTGO e nickArena com string vazia", async () => {
        const gateway = criarMockUsuarioGateway({
            buscarPorId: jest.fn().mockResolvedValue({ ...usuarioExistente, nickMTGO: "old", nickArena: "old" }),
        });
        const uc = AtualizarUsuario.criar(gateway);

        const resultado = await uc.executar({ id: "user-1", nickMTGO: "  ", nickArena: "" });
        expect(resultado.nickMTGO).toBeUndefined();
        expect(resultado.nickArena).toBeUndefined();
    });
});
