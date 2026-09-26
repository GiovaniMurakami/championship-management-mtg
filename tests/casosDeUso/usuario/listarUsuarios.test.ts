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
        const listar = vi.fn().mockResolvedValue([usuario]);
        const listarTotal = vi.fn().mockResolvedValue(1);
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
                    role: "user",
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
            role: undefined,
            bloqueadoTorneios: undefined,
            limite: 20,
            offset: 0,
        });
        expect(listarTotal).toHaveBeenCalledWith({
            nome: undefined,
            role: undefined,
            bloqueadoTorneios: undefined,
        });
    });

    it("aplica filtros de nome (trim) e bloqueadoTorneios", async () => {
        const listar = vi.fn().mockResolvedValue([]);
        const listarTotal = vi.fn().mockResolvedValue(0);
        const uc = ListarUsuarios.criar(
            criarMockUsuarioGateway({ listar, listarTotal }),
        );

        await uc.executar({
            nome: "  alice  ",
            role: "editor",
            bloqueadoTorneios: true,
            limite: 10,
            offset: 5,
        });

        expect(listar).toHaveBeenCalledWith({
            nome: "alice",
            role: "editor",
            bloqueadoTorneios: true,
            limite: 10,
            offset: 5,
        });
        expect(listarTotal).toHaveBeenCalledWith({
            nome: "alice",
            role: "editor",
            bloqueadoTorneios: true,
        });
    });

    it("ignora nome só com espaços e limita máximo em 100", async () => {
        const listar = vi.fn().mockResolvedValue([]);
        const listarTotal = vi.fn().mockResolvedValue(0);
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
