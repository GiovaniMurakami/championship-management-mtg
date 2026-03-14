import { BuscarTorneio } from "../../../src/casosDeUso/torneio/buscarTorneio";
import { criarMockTorneioGateway, criarMockInscricaoGateway, criarMockPartidaGateway, criarMockUsuarioGateway } from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Inscricao } from "../../../src/dominio/entidade/inscricao";
import { Partida } from "../../../src/dominio/entidade/partida";
import { Usuario } from "../../../src/dominio/entidade/usuario";

describe("BuscarTorneio", () => {
    const torneio = new Torneio({
        id: "t-1", nome: "Torneio", horario: new Date(), formato: "legacy",
        donoId: "u-1", status: "em_andamento", rodadaAtual: 1, totalRodadas: 3,
    });

    it("deve retornar detalhes do torneio com partidas e inscrições", async () => {
        const inscricoes = [
            new Inscricao({ id: "i1", torneioId: "t-1", usuarioId: "u-1", checkIn: true, checkInRodada: 0, dropped: false }),
            new Inscricao({ id: "i2", torneioId: "t-1", usuarioId: "u-2", checkIn: true, checkInRodada: 0, dropped: false }),
        ];
        const partidas = [
            new Partida({ id: "p1", torneioId: "t-1", rodada: 1, jogador1Id: "u-1", jogador2Id: "u-2", vitoriasJogador1: 0, vitoriasJogador2: 0, status: "pendente" }),
        ];
        const usuarios = [
            new Usuario({ id: "u-1", nome: "João", email: "j@e.com", senha: "s" }),
            new Usuario({ id: "u-2", nome: "Maria", email: "m@e.com", senha: "s" }),
        ];

        const uc = BuscarTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway({ listarPorTorneio: jest.fn().mockResolvedValue(inscricoes) }),
            criarMockPartidaGateway({ listarPorTorneio: jest.fn().mockResolvedValue(partidas) }),
            criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(usuarios) }),
        );

        const resultado = await uc.executar({ torneioId: "t-1" });

        expect(resultado.id).toBe("t-1");
        expect(resultado.totalInscritos).toBe(2);
        expect(resultado.totalCheckin).toBe(2);
        expect(resultado.partidas).toHaveLength(1);
        expect(resultado.partidas[0].jogador1Nome).toBe("João");
        expect(resultado.partidas[0].jogador2Nome).toBe("Maria");
    });

    it("deve lançar erro se o torneio não for encontrado", async () => {
        const uc = BuscarTorneio.criar(
            criarMockTorneioGateway(),
            criarMockInscricaoGateway(),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway(),
        );

        await expect(
            uc.executar({ torneioId: "inexistente" })
        ).rejects.toMatchObject({ status: 404 });
    });
});
