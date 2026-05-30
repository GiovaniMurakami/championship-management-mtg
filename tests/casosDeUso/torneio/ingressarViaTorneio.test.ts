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
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };

    const deckValido = new Deck({
        id: "d-1", nome: "Deck Teste", formato: "legacy",
        maindeck: [], sideboard: [], usuarioId: "u-novo",
    });

    function criarUc(overrides: {
        linkData?: LinkIngressoData | null;
        jaInscrito?: boolean;
        inscricoes?: { dropped: boolean }[];
        deck?: Deck | null;
        partidasRodada?: Partida[];
        salvarPartida?: jest.Mock;
    } = {}) {
        const {
            linkData = linkValido,
            jaInscrito = false,
            inscricoes = [{ dropped: false }],
            deck = deckValido,
            partidasRodada = [],
            salvarPartida = jest.fn(),
        } = overrides;

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
                listarPorTorneioERodada: jest.fn().mockResolvedValue(partidasRodada),
                salvar: salvarPartida,
            }),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
            criarMockLinkIngressoGateway({
                buscarPorToken: jest.fn().mockResolvedValue(linkData),
                excluirPorToken: jest.fn(),
            }),
            criarMockDeckGateway({
                buscarPorId: jest.fn().mockResolvedValue(deck),
                salvar: jest.fn(),
            }),
        );
    }

    it("deve inscrever jogador e receber penalidade (BYE 0-2) quando não há BYE na rodada", async () => {
        const salvarPartida = jest.fn();
        const uc = criarUc({ salvarPartida });

        const resultado = await uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-1" });

        expect(resultado.torneioId).toBe("t-1");
        expect(resultado.usuarioId).toBe("u-novo");
        expect(resultado.vitoriasJogador1).toBe(0);
        expect(resultado.vitoriasJogador2).toBe(2);
        const partidaCriada = salvarPartida.mock.calls[0][0] as Partida;
        expect(partidaCriada.mesa).toBe(1);
    });

    it("deve criar nova partida de penalidade quando já existe um BYE na rodada", async () => {
        const byePartidaExistente = new Partida({
            id: "bye-p-1",
            torneioId: "t-1",
            rodada: 2,
            jogador1Id: "u-bye",
            jogador2Id: null,
            vitoriasJogador1: 2,
            vitoriasJogador2: 0,
            status: "finalizada",
            mesa: 7,
        });
        const salvarPartida = jest.fn();
        const uc = criarUc({
            partidasRodada: [byePartidaExistente],
            salvarPartida,
        });

        const resultado = await uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-1" });

        expect(resultado.vitoriasJogador1).toBe(0);
        expect(resultado.vitoriasJogador2).toBe(2);
        expect(resultado.partidaId).not.toBe("bye-p-1");
        const partidaCriada = salvarPartida.mock.calls[0][0] as Partida;
        expect(partidaCriada.jogador2Id).toBeNull();
        expect(partidaCriada.tipoBye).toBe("penalidade");
        expect(partidaCriada.mesa).toBe(8);
    });

    it("deve criar nova partida adicional mesmo quando já existem bye normal e byes de penalidade na rodada", async () => {
        const byeNormal = new Partida({
            id: "bye-normal",
            torneioId: "t-1",
            rodada: 2,
            jogador1Id: "u-bye",
            jogador2Id: null,
            vitoriasJogador1: 2,
            vitoriasJogador2: 0,
            status: "finalizada",
            tipoBye: "normal",
            mesa: 4,
        });
        const byePenalidadeExistente = new Partida({
            id: "bye-penalidade-1",
            torneioId: "t-1",
            rodada: 2,
            jogador1Id: "u-tardio-1",
            jogador2Id: null,
            vitoriasJogador1: 0,
            vitoriasJogador2: 2,
            status: "finalizada",
            tipoBye: "penalidade",
            mesa: 5,
        });
        const salvarPartida = jest.fn();
        const uc = criarUc({
            partidasRodada: [byeNormal, byePenalidadeExistente],
            salvarPartida,
        });

        const resultado = await uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-1" });

        expect(resultado.vitoriasJogador1).toBe(0);
        expect(resultado.vitoriasJogador2).toBe(2);
        const partidaCriada = salvarPartida.mock.calls[0][0] as Partida;
        expect(partidaCriada.id).not.toBe("bye-normal");
        expect(partidaCriada.id).not.toBe("bye-penalidade-1");
        expect(partidaCriada.jogador2Id).toBeNull();
        expect(partidaCriada.tipoBye).toBe("penalidade");
        expect(partidaCriada.mesa).toBe(6);
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
            expiresAt: new Date(Date.now() - 1000),
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
            criarMockPartidaGateway({ salvar: jest.fn(), listarPorTorneioERodada: jest.fn().mockResolvedValue([]) }),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
            criarMockLinkIngressoGateway({
                buscarPorToken: jest.fn().mockResolvedValue(linkValido),
                excluirPorToken: excluirMock,
            }),
            criarMockDeckGateway({
                buscarPorId: jest.fn().mockResolvedValue(deckValido),
                salvar: jest.fn(),
            }),
        );

        await uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-1" });

        expect(excluirMock).toHaveBeenCalledWith("token-uuid");
    });

    it("deve aumentar totalRodadas quando o novo jogador eleva o mínimo necessário de rodadas", async () => {
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
            criarMockPartidaGateway({ salvar: jest.fn(), listarPorTorneioERodada: jest.fn().mockResolvedValue([]) }),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
            criarMockLinkIngressoGateway({
                buscarPorToken: jest.fn().mockResolvedValue(linkValido),
                excluirPorToken: jest.fn(),
            }),
            criarMockDeckGateway({
                buscarPorId: jest.fn().mockResolvedValue(deckValido),
                salvar: jest.fn(),
            }),
        );

        await uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-1" });

        expect(atualizarMock).toHaveBeenCalledTimes(1);
        expect(torneio4.totalRodadas).toBe(3);
    });

    it("não deve alterar totalRodadas quando o novo jogador não muda o número de rodadas necessário", async () => {
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
            criarMockPartidaGateway({ salvar: jest.fn(), listarPorTorneioERodada: jest.fn().mockResolvedValue([]) }),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
            criarMockLinkIngressoGateway({
                buscarPorToken: jest.fn().mockResolvedValue(linkValido),
                excluirPorToken: jest.fn(),
            }),
            criarMockDeckGateway({
                buscarPorId: jest.fn().mockResolvedValue(deckValido),
                salvar: jest.fn(),
            }),
        );

        await uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-1" });

        expect(atualizarMock).not.toHaveBeenCalled();
        expect(torneio3.totalRodadas).toBe(2);
    });

    it("deve respeitar o limite maxRodadas ao calcular rodada extra", async () => {
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
            criarMockPartidaGateway({ salvar: jest.fn(), listarPorTorneioERodada: jest.fn().mockResolvedValue([]) }),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
            criarMockLinkIngressoGateway({
                buscarPorToken: jest.fn().mockResolvedValue(linkValido),
                excluirPorToken: jest.fn(),
            }),
            criarMockDeckGateway({
                buscarPorId: jest.fn().mockResolvedValue(deckValido),
                salvar: jest.fn(),
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
            emCorte: true,
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

    it("deve lançar 403 se o deck não pertencer ao usuário", async () => {
        const deckDeOutroUsuario = new Deck({
            id: "d-2", nome: "Deck Alheio", formato: "legacy",
            maindeck: [], sideboard: [], usuarioId: "u-outro",
        });
        const uc = criarUc({ deck: deckDeOutroUsuario });

        await expect(
            uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-2" })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("deve criar inscrição com checkInRodada igual à rodada atual e deckId", async () => {
        const salvarMock = jest.fn();
        const salvarDeckMock = jest.fn();
        const uc = IngressarViaTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio), atualizar: jest.fn() }),
            criarMockInscricaoGateway({
                buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(null),
                salvar: salvarMock,
                listarPorTorneio: jest.fn().mockResolvedValue([{ dropped: false }]),
            }),
            criarMockPartidaGateway({ salvar: jest.fn(), listarPorTorneioERodada: jest.fn().mockResolvedValue([]) }),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
            criarMockLinkIngressoGateway({
                buscarPorToken: jest.fn().mockResolvedValue(linkValido),
                excluirPorToken: jest.fn(),
            }),
            criarMockDeckGateway({
                buscarPorId: jest.fn().mockResolvedValue(deckValido),
                salvar: salvarDeckMock,
            }),
        );

        await uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-1" });

        expect(salvarMock).toHaveBeenCalledTimes(1);
        expect(salvarDeckMock).toHaveBeenCalledTimes(1);
        const inscricaoSalva = salvarMock.mock.calls[0][0];
        expect(inscricaoSalva.checkInRodada).toBe(torneio.rodadaAtual);
        expect(inscricaoSalva.deckId).toBeDefined();
        expect(inscricaoSalva.deckId).not.toBe("d-1");
    });

    it("deve calcular a próxima mesa ignorando partidas sem mesa definida", async () => {
        const partidasRodada = [
            new Partida({
                id: "p-sem-mesa",
                torneioId: "t-1",
                rodada: 2,
                jogador1Id: "u-a",
                jogador2Id: "u-b",
                vitoriasJogador1: 0,
                vitoriasJogador2: 0,
                status: "pendente",
                mesa: null,
            }),
            new Partida({
                id: "p-com-mesa",
                torneioId: "t-1",
                rodada: 2,
                jogador1Id: "u-c",
                jogador2Id: "u-d",
                vitoriasJogador1: 0,
                vitoriasJogador2: 0,
                status: "pendente",
                mesa: 3,
            }),
        ];
        const salvarPartida = jest.fn();
        const uc = criarUc({ partidasRodada, salvarPartida });

        await uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-1" });

        const partidaCriada = salvarPartida.mock.calls[0][0] as Partida;
        expect(partidaCriada.mesa).toBe(4);
    });

    it("não deve consumir o token quando o deck é inválido", async () => {
        const excluirMock = jest.fn();
        const uc = IngressarViaTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway({ buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(null) }),
            criarMockPartidaGateway(),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
            criarMockLinkIngressoGateway({
                buscarPorToken: jest.fn().mockResolvedValue(linkValido),
                excluirPorToken: excluirMock,
            }),
            criarMockDeckGateway({
                buscarPorId: jest.fn().mockResolvedValue(null),
            }),
        );

        await expect(
            uc.executar({ token: "token-uuid", usuarioId: "u-novo", deckId: "d-invalido" })
        ).rejects.toMatchObject({ status: 404 });

        expect(excluirMock).not.toHaveBeenCalled();
    });
});
