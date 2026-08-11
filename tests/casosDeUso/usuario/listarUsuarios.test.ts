import { ListarUsuarios } from "../../../src/casosDeUso/usuario/listarUsuarios";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { criarMockUsuarioGateway } from "../../mocks/gateways";

describe("ListarUsuarios", () => {
    const usuario = new Usuario({
        id: "u-1",
        nome: "Alice",
        email: "a@test.com",
        senha: "hash",
        nickMTGO: "alice_mtgo",
        nickArena: "alice#123",
        bloqueadoTorneios: false,
    });

    it("lista com paginação padrão e mapeia campos públicos", async () => {
        const listar = jest.fn().mockResolvedValue([usuario]);
        const listarTotal = jest.fn().mockResolvedValue(1);
        const uc = ListarUsuarios.criar(
            criarMockUsuarioGateway({ listar, listarTotal }),
        );

        const resultado = await uc.executar({});

        expect(resultado).toEqual({
            usuarios: [
                {
                    id: "u-1",
                    nome: "Alice",
                    email: "a@test.com",
                    nickMTGO: "alice_mtgo",
                    nickArena: "alice#123",
                    bloqueadoTorneios: false,
                },
            ],
            total: 1,
            limite: 20,
            offset: 0,
        });
        expect(listar).toHaveBeenCalledWith({
            nome: undefined,
            bloqueadoTorneios: undefined,
            limite: 20,
            offset: 0,
        });
        expect(listarTotal).toHaveBeenCalledWith({
            nome: undefined,
            bloqueadoTorneios: undefined,
        });
    });

    it("aplica filtros de nome (trim) e bloqueadoTorneios", async () => {
        const listar = jest.fn().mockResolvedValue([]);
        const listarTotal = jest.fn().mockResolvedValue(0);
        const uc = ListarUsuarios.criar(
            criarMockUsuarioGateway({ listar, listarTotal }),
        );

        await uc.executar({
            nome: "  alice  ",
            bloqueadoTorneios: true,
            limite: 10,
            offset: 5,
        });

        expect(listar).toHaveBeenCalledWith({
            nome: "alice",
            bloqueadoTorneios: true,
            limite: 10,
            offset: 5,
        });
        expect(listarTotal).toHaveBeenCalledWith({
            nome: "alice",
            bloqueadoTorneios: true,
        });
    });

    it("ignora nome só com espaços e limita máximo em 100", async () => {
        const listar = jest.fn().mockResolvedValue([]);
        const listarTotal = jest.fn().mockResolvedValue(0);
        const uc = ListarUsuarios.criar(
            criarMockUsuarioGateway({ listar, listarTotal }),
        );

        const resultado = await uc.executar({
            nome: "   ",
            limite: 999,
            offset: -3,
        });

        expect(resultado.limite).toBe(100);
        expect(resultado.offset).toBe(0);
        expect(listar).toHaveBeenCalledWith(
            expect.objectContaining({ nome: undefined, limite: 100, offset: 0 }),
        );
    });
});
