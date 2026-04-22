import { IngressarViaTorneio } from "../../../src/casosDeUso/torneio/ingressarViaTorneio";
import {
    criarMockTorneioGateway,
    criarMockInscricaoGateway,
    criarMockPartidaGateway,
    criarMockUsuarioGateway,
    criarMockLinkIngressoGateway,
    criarMockDeckGateway,
} from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Partida } from "../../../src/dominio/entidade/partida";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { Deck } from "../../../src/dominio/entidade/deck";
import { LinkIngressoData } from "../../../src/dominio/gateway/linkIngressoGateway";

describe("IngressarViaTorneio", () => {
    const torneio = new Torneio({
        id: "t-1", nome: "Torneio", horario: new Date(), formato: "legacy",
        donoId: "dono-1", status: "em_andamento", rodadaAtual: 2, totalRodadas: 4,
    });

    const usuario = new Usuario({
        id: "u-novo", nome: "Novo Jogador", email: "novo@email.com", senha: "senha",
        nickMTGO: "NickMTGO_Novo",
    });

    const linkValido: LinkIngressoData = {
        token: "token-uuid",
        torneioId: "t-1",
        criadoPorId: "dono-1",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // +1h
    };

    const deckValido = new Deck({
        id: "d-1", nome: "Deck Teste", formato: "legacy",
        maindeck: [], sideboard: [], usuarioId: "u-novo",
    });

    function criarUc(overrides: {
        linkData?: LinkIngressoData | null;
        byePartida?: Partida | null;
        jaInscrito?: boolean;
        inscricoes?: { dropped: boolean }[];
        deck?: Deck | null;
    } = {}) {
        const { linkData = linkValido, byePartida = null, jaInscrito = false, inscricoes = [{ dropped: false }], deck = deckValido } = overrides;
        return IngressarViaTorneio.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneio),
                atualizar: jest.fn(),
            }),
            criarMockInscricaoGateway({
                buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(jaInscrito ? { id: "i-existe" } : null),
                salvar: jest.fn(),
                listarPorTorneio: jest.fn().mockResolvedValue(inscricoes),
            }),
            criarMockPartidaGateway({
                buscarByePartidaRodada: jest.fn().mockResolvedValue(byePartida),
                atualizarJogador2Partida: jest.fn().mockImplementation((id: string, jogador2Id: string) =>
                    Promise.resolve(new Partida({
                        id, torneioId: "t-1", rodada: 2,
                        jogador1Id: "bye-rival", jogador2Id: jogador2Id,
                        vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada",
                    }))
                ),
                salvar: jest.fn(),
            }),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
            criarMockLinkIngressoGateway({
                buscarPorToken: jest.fn().mockResolvedValue(linkData),
                excluirPorToken: jest.fn(),
            }),
            criarMockDeckGateway({
                buscarPorId: jest.fn().mockResolvedValue(deck),
            }),
        );
    }

    it("deve inscrever jogador e receber penalidade (BYE 0-2) quando não há partida BYE disponível", async () => {
        const uc = criarUc({ byePartida: null });

        const resultado = await uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-1" });

        expect(resultado.torneioId).toBe("t-1");
        expect(resultado.usuarioId).toBe("u-novo");
        expect(resultado.vitoriasJogador1).toBe(0);
        expect(resultado.vitoriasJogador2).toBe(2);
    });

    it("deve substituir BYE existente e o original mantém vitória 2-0", async () => {
        const byePartidaExistente = new Partida({
            id: "bye-p-1", torneioId: "t-1", rodada: 2,
            jogador1Id: "u-bye", jogador2Id: null,
            vitoriasJogador1: 2, vitoriasJogador2: 0, status: "finalizada",
        });
        const uc = criarUc({ byePartida: byePartidaExistente });

        const resultado = await uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-1" });

        expect(resultado.vitoriasJogador1).toBe(2);
        expect(resultado.vitoriasJogador2).toBe(0);
        expect(resultado.partidaId).toBe("bye-p-1");
    });

    it("deve lançar 404 se o token for inválido", async () => {
        const uc = criarUc({ linkData: null });

        await expect(
            uc.executar({ token: "token-invalido", usuarioId: "u-novo", deckId: "d-1" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 400 se o token estiver expirado", async () => {
        const linkExpirado: LinkIngressoData = {
            ...linkValido,
            expiresAt: new Date(Date.now() - 1000), // expirou há 1 segundo
        };
        const uc = criarUc({ linkData: linkExpirado });

        await expect(
            uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-1" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 400 se o usuário já estiver inscrito", async () => {
        const uc = criarUc({ jaInscrito: true });

        await expect(
            uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-1" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 400 se o usuário não tiver nickMTGO", async () => {
        const usuarioSemNick = new Usuario({
            id: "u-novo", nome: "Sem Nick", email: "semnnick@email.com", senha: "senha",
        });
        const uc = IngressarViaTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway({ buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(null) }),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuarioSemNick) }),
            criarMockLinkIngressoGateway({
                buscarPorToken: jest.fn().mockResolvedValue(linkValido),
                excluirPorToken: jest.fn(),
            }),
            criarMockDeckGateway(),
        );

        await expect(
            uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-1" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve consumir o token após ingresso bem-sucedido (uso único)", async () => {
        const excluirMock = jest.fn();
        const uc = IngressarViaTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio), atualizar: jest.fn() }),
            criarMockInscricaoGateway({
                buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(null),
                salvar: jest.fn(),
                listarPorTorneio: jest.fn().mockResolvedValue([{ dropped: false }]),
            }),
            criarMockPartidaGateway({ salvar: jest.fn() }),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
            criarMockLinkIngressoGateway({
                buscarPorToken: jest.fn().mockResolvedValue(linkValido),
                excluirPorToken: excluirMock,
            }),
            criarMockDeckGateway({
                buscarPorId: jest.fn().mockResolvedValue(deckValido),
            }),
        );

        await uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-1" });

        expect(excluirMock).toHaveBeenCalledWith("token-uuid");
    });

    it("deve aumentar totalRodadas quando o novo jogador eleva o mínimo necessário de rodadas", async () => {
        // torneio com 4 jogadores ativos → ceil(log2(4)) = 2 rodadas (já definido)
        // novo jogador entra → 5 ativos → ceil(log2(5)) = 3 rodadas
        const torneio4 = new Torneio({
            id: "t-1", nome: "Torneio", horario: new Date(), formato: "legacy",
            donoId: "dono-1", status: "em_andamento", rodadaAtual: 1, totalRodadas: 2,
        });

        const atualizarMock = jest.fn();
        const inscricoes5Ativos = Array.from({ length: 5 }, (_, i) => ({ dropped: false, id: `i-${i}` }));

        const uc = IngressarViaTorneio.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneio4),
                atualizar: atualizarMock,
            }),
            criarMockInscricaoGateway({
                buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(null),
                salvar: jest.fn(),
                listarPorTorneio: jest.fn().mockResolvedValue(inscricoes5Ativos),
            }),
            criarMockPartidaGateway({ salvar: jest.fn() }),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
            criarMockLinkIngressoGateway({
                buscarPorToken: jest.fn().mockResolvedValue(linkValido),
                excluirPorToken: jest.fn(),
            }),
            criarMockDeckGateway({
                buscarPorId: jest.fn().mockResolvedValue(deckValido),
            }),
        );

        await uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-1" });

        // totalRodadas deve ter sido atualizado para 3
        expect(atualizarMock).toHaveBeenCalledTimes(1);
        expect(torneio4.totalRodadas).toBe(3);
    });

    it("não deve alterar totalRodadas quando o novo jogador não muda o número de rodadas necessário", async () => {
        // torneio com 3 jogadores ativos → ceil(log2(3)) = 2; com 4 → ceil(log2(4)) = 2 (sem mudança)
        const torneio3 = new Torneio({
            id: "t-1", nome: "Torneio", horario: new Date(), formato: "legacy",
            donoId: "dono-1", status: "em_andamento", rodadaAtual: 1, totalRodadas: 2,
        });

        const atualizarMock = jest.fn();
        const inscricoes4Ativos = Array.from({ length: 4 }, (_, i) => ({ dropped: false, id: `i-${i}` }));

        const uc = IngressarViaTorneio.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneio3),
                atualizar: atualizarMock,
            }),
            criarMockInscricaoGateway({
                buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(null),
                salvar: jest.fn(),
                listarPorTorneio: jest.fn().mockResolvedValue(inscricoes4Ativos),
            }),
            criarMockPartidaGateway({ salvar: jest.fn() }),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
            criarMockLinkIngressoGateway({
                buscarPorToken: jest.fn().mockResolvedValue(linkValido),
                excluirPorToken: jest.fn(),
            }),
            criarMockDeckGateway({
                buscarPorId: jest.fn().mockResolvedValue(deckValido),
            }),
        );

        await uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-1" });

        expect(atualizarMock).not.toHaveBeenCalled();
        expect(torneio3.totalRodadas).toBe(2);
    });

    it("deve respeitar o limite maxRodadas ao calcular rodada extra", async () => {
        // 5 ativos → ceil(log2(5)) = 3, mas maxRodadas = 2 → não deve aumentar
        const torneioComCap = new Torneio({
            id: "t-1", nome: "Torneio", horario: new Date(), formato: "legacy",
            donoId: "dono-1", status: "em_andamento", rodadaAtual: 1, totalRodadas: 2, maxRodadas: 2,
        });

        const atualizarMock = jest.fn();
        const inscricoes5Ativos = Array.from({ length: 5 }, (_, i) => ({ dropped: false, id: `i-${i}` }));

        const uc = IngressarViaTorneio.criar(
            criarMockTorneioGateway({
                buscarPorId: jest.fn().mockResolvedValue(torneioComCap),
                atualizar: atualizarMock,
            }),
            criarMockInscricaoGateway({
                buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(null),
                salvar: jest.fn(),
                listarPorTorneio: jest.fn().mockResolvedValue(inscricoes5Ativos),
            }),
            criarMockPartidaGateway({ salvar: jest.fn() }),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
            criarMockLinkIngressoGateway({
                buscarPorToken: jest.fn().mockResolvedValue(linkValido),
                excluirPorToken: jest.fn(),
            }),
            criarMockDeckGateway({
                buscarPorId: jest.fn().mockResolvedValue(deckValido),
            }),
        );

        await uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-1" });

        expect(atualizarMock).not.toHaveBeenCalled();
        expect(torneioComCap.totalRodadas).toBe(2);
    });

    it("deve lançar 400 se o torneio estiver em fase de corte", async () => {
        const torneioEmCorte = new Torneio({
            id: "t-1", nome: "Torneio", horario: new Date(), formato: "legacy",
            donoId: "dono-1", status: "em_andamento", rodadaAtual: 3, totalRodadas: 4,
            emCorte: true, rodadaCorteInicio: 3, rodadaCorteFim: 5,
        });

        const uc = IngressarViaTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioEmCorte) }),
            criarMockInscricaoGateway({ buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(null) }),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
            criarMockLinkIngressoGateway({
                buscarPorToken: jest.fn().mockResolvedValue(linkValido),
                excluirPorToken: jest.fn(),
            }),
            criarMockDeckGateway(),
        );

        await expect(
            uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-1" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 400 se o torneio não estiver em andamento", async () => {
        const torneioFinalizado = new Torneio({
            id: "t-1", nome: "Torneio", horario: new Date(), formato: "legacy",
            donoId: "dono-1", status: "finalizado", rodadaAtual: 3, totalRodadas: 3,
        });

        const uc = IngressarViaTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneioFinalizado) }),
            criarMockInscricaoGateway({ buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(null) }),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
            criarMockLinkIngressoGateway({
                buscarPorToken: jest.fn().mockResolvedValue(linkValido),
                excluirPorToken: jest.fn(),
            }),
            criarMockDeckGateway(),
        );

        await expect(
            uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-1" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 404 se o usuário não existir", async () => {
        const uc = IngressarViaTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway({ buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(null) }),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(null) }),
            criarMockLinkIngressoGateway({
                buscarPorToken: jest.fn().mockResolvedValue(linkValido),
                excluirPorToken: jest.fn(),
            }),
            criarMockDeckGateway(),
        );

        await expect(
            uc.executar({ token: "token-uuid", usuarioId: "u-inexistente", deckId: "d-1" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve criar inscrição com checkInRodada igual à rodada atual e deckId", async () => {
        const salvarMock = jest.fn();
        const uc = IngressarViaTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio), atualizar: jest.fn() }),
            criarMockInscricaoGateway({
                buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(null),
                salvar: salvarMock,
                listarPorTorneio: jest.fn().mockResolvedValue([{ dropped: false }]),
            }),
            criarMockPartidaGateway({ salvar: jest.fn() }),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
            criarMockLinkIngressoGateway({
                buscarPorToken: jest.fn().mockResolvedValue(linkValido),
                excluirPorToken: jest.fn(),
            }),
            criarMockDeckGateway({
                buscarPorId: jest.fn().mockResolvedValue(deckValido),
            }),
        );

        await uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-1" });

        expect(salvarMock).toHaveBeenCalledTimes(1);
        const inscricaoSalva = salvarMock.mock.calls[0][0];
        expect(inscricaoSalva.checkInRodada).toBe(torneio.rodadaAtual);
        expect(inscricaoSalva.deckId).toBe("d-1");
    });
});
