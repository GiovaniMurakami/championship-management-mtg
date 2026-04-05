import { IngressarViaTorneio } from "../../../src/casosDeUso/torneio/ingressarViaTorneio";
import {
    criarMockTorneioGateway,
    criarMockInscricaoGateway,
    criarMockPartidaGateway,
    criarMockUsuarioGateway,
    criarMockLinkIngressoGateway,
} from "../../mocks/gateways";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { Partida } from "../../../src/dominio/entidade/partida";
import { Usuario } from "../../../src/dominio/entidade/usuario";
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

    function criarUc(overrides: {
        linkData?: LinkIngressoData | null;
        byePartida?: Partida | null;
        jaInscrito?: boolean;
    } = {}) {
        const { linkData = linkValido, byePartida = null, jaInscrito = false } = overrides;
        return IngressarViaTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway({
                buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(jaInscrito ? { id: "i-existe" } : null),
                salvar: jest.fn(),
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
        );
    }

    it("deve inscrever jogador e receber penalidade (BYE 0-2) quando não há partida BYE disponível", async () => {
        const uc = criarUc({ byePartida: null });

        const resultado = await uc.executar({ token: "token-uuid", usuarioId: "u-novo" });

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

        const resultado = await uc.executar({ token: "token-uuid", usuarioId: "u-novo" });

        expect(resultado.vitoriasJogador1).toBe(2);
        expect(resultado.vitoriasJogador2).toBe(0);
        expect(resultado.partidaId).toBe("bye-p-1");
    });

    it("deve lançar 404 se o token for inválido", async () => {
        const uc = criarUc({ linkData: null });

        await expect(
            uc.executar({ token: "token-invalido", usuarioId: "u-novo" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 400 se o token estiver expirado", async () => {
        const linkExpirado: LinkIngressoData = {
            ...linkValido,
            expiresAt: new Date(Date.now() - 1000), // expirou há 1 segundo
        };
        const uc = criarUc({ linkData: linkExpirado });

        await expect(
            uc.executar({ token: "token-uuid", usuarioId: "u-novo" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 400 se o usuário já estiver inscrito", async () => {
        const uc = criarUc({ jaInscrito: true });

        await expect(
            uc.executar({ token: "token-uuid", usuarioId: "u-novo" })
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
        );

        await expect(
            uc.executar({ token: "token-uuid", usuarioId: "u-novo" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve consumir o token após ingresso bem-sucedido (uso único)", async () => {
        const excluirMock = jest.fn();
        const uc = IngressarViaTorneio.criar(
            criarMockTorneioGateway({ buscarPorId: jest.fn().mockResolvedValue(torneio) }),
            criarMockInscricaoGateway({
                buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(null),
                salvar: jest.fn(),
            }),
            criarMockPartidaGateway({ salvar: jest.fn() }),
            criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(usuario) }),
            criarMockLinkIngressoGateway({
                buscarPorToken: jest.fn().mockResolvedValue(linkValido),
                excluirPorToken: excluirMock,
            }),
        );

        await uc.executar({ token: "token-uuid", usuarioId: "u-novo" });

        expect(excluirMock).toHaveBeenCalledWith("token-uuid");
    });
});
