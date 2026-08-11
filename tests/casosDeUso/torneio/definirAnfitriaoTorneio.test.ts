import { DefinirAnfitriaoTorneio } from "../../../src/casosDeUso/torneio/definirAnfitriaoTorneio";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { criarMockTorneioGateway, criarMockUsuarioGateway } from "../../mocks/gateways";

describe("DefinirAnfitriaoTorneio", () => {
    const torneioBase = () =>
        new Torneio({
            id: "t-1",
            nome: "Torneio",
            horario: new Date(),
            formato: "modern",
            donoId: "dono-1",
            status: "inscricoes_abertas",
            rodadaAtual: 0,
            totalRodadas: 0,
        });

    const anfitriao = new Usuario({
        id: "anf-1",
        nome: "Anfitrião",
        email: "anf@test.com",
        senha: "hash",
    });

    it("define anfitrião quando o usuário existe", async () => {
        const torneio = torneioBase();
        const atualizar = jest.fn().mockResolvedValue(undefined);
        const uc = DefinirAnfitriaoTorneio.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneio),
                atualizar,
            }),
            criarMockUsuarioGateway({
                buscarPorId: jest.fn().mockResolvedValue(anfitriao),
            }),
        );

        const resultado = await uc.executar({ torneioId: "t-1", anfitriaoId: "anf-1" });

        expect(resultado).toEqual({
            id: "t-1",
            anfitriaoId: "anf-1",
            anfitriao: { id: "anf-1", nome: "Anfitrião", email: "anf@test.com" },
        });
        expect(torneio.anfitriaoId).toBe("anf-1");
        expect(atualizar).toHaveBeenCalledWith(torneio);
    });

    it("remove anfitrião quando anfitriaoId é null", async () => {
        const torneio = torneioBase();
        torneio.anfitriaoId = "anf-1";
        const atualizar = jest.fn().mockResolvedValue(undefined);
        const usuarioGw = criarMockUsuarioGateway();
        const uc = DefinirAnfitriaoTorneio.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneio),
                atualizar,
            }),
            usuarioGw,
        );

        const resultado = await uc.executar({ torneioId: "t-1", anfitriaoId: null });

        expect(resultado).toEqual({ id: "t-1", anfitriaoId: null, anfitriao: null });
        expect(torneio.anfitriaoId).toBeNull();
        expect(usuarioGw.buscarPorId).not.toHaveBeenCalled();
        expect(atualizar).toHaveBeenCalledWith(torneio);
    });

    it("retorna 404 quando torneio não existe", async () => {
        const uc = DefinirAnfitriaoTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(null) }),
            criarMockUsuarioGateway(),
        );

        await expect(uc.executar({ torneioId: "x", anfitriaoId: "anf-1" })).rejects.toMatchObject({
            message: "Torneio não encontrado.",
            status: 404,
        });
    });

    it("retorna 404 quando usuário anfitrião não existe", async () => {
        const uc = DefinirAnfitriaoTorneio.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneioBase()),
            }),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(null) }),
        );

        await expect(uc.executar({ torneioId: "t-1", anfitriaoId: "missing" })).rejects.toMatchObject({
            message: "Usuário anfitrião não encontrado.",
            status: 404,
        });
    });
});
