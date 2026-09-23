import { UsuarioGateway } from "../../src/dominio/gateway/usuarioGateway";
import { TokenBlacklistGateway } from "../../src/dominio/gateway/tokenBlacklistGateway";
import { DeckGateway } from "../../src/dominio/gateway/deckGateway";
import { TorneioGateway } from "../../src/dominio/gateway/torneioGateway";
import { InscricaoGateway } from "../../src/dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../src/dominio/gateway/partidaGateway";
import { LigaGateway } from "../../src/dominio/gateway/ligaGateway";
import { TimeGateway } from "../../src/dominio/gateway/timeGateway";
import { LoginAttemptGateway } from "../../src/dominio/gateway/loginAttemptGateway";
import { RefreshTokenGateway } from "../../src/dominio/gateway/refreshTokenGateway";
import { EmailGateway } from "../../src/dominio/gateway/emailGateway";
import { ResetSenhaGateway } from "../../src/dominio/gateway/resetSenhaGateway";
import { ImagemGateway } from "../../src/dominio/gateway/imagemGateway";
import { LinkIngressoGateway } from "../../src/dominio/gateway/linkIngressoGateway";

export function criarMockUsuarioGateway(overrides: Partial<UsuarioGateway> = {}): UsuarioGateway {
    return {
        salvar: vi.fn(),
        buscarPorEmail: vi.fn().mockResolvedValue(null),
        buscarPorId: vi.fn().mockResolvedValue(null),
        buscarVarios: vi.fn().mockResolvedValue([]),
        listar: vi.fn().mockResolvedValue([]),
        listarTotal: vi.fn().mockResolvedValue(0),
        atualizar: vi.fn(),
        excluir: vi.fn(),
        incrementarResultadosExpressivos: vi.fn(),
        ...overrides,
    };
}

export function criarMockDeckGateway(overrides: Partial<DeckGateway> = {}): DeckGateway {
    return {
        salvar: vi.fn(),
        buscarPorId: vi.fn().mockResolvedValue(null),
        buscarPorPrefixo: vi.fn().mockResolvedValue(null),
        buscarVarios: vi.fn().mockResolvedValue([]),
        listarPorUsuario: vi.fn().mockResolvedValue([]),
        listarPorDeckOriginalId: vi.fn().mockResolvedValue([]),
        listar: vi.fn().mockResolvedValue([]),
        listarTotal: vi.fn().mockResolvedValue(0),
        incrementarVisualizacoes: vi.fn().mockResolvedValue(null),
        atualizar: vi.fn(),
        excluir: vi.fn(),
        excluirPorUsuario: vi.fn().mockResolvedValue(0),
        ...overrides,
    };
}

export function criarMockTorneioGateway(overrides: Partial<TorneioGateway> = {}): TorneioGateway {
    return {
        salvar: vi.fn(),
        buscarPorId: vi.fn().mockResolvedValue(null),
        buscarPorPrefixo: vi.fn().mockResolvedValue(null),
        listar: vi.fn().mockResolvedValue([]),
        listarTotal: vi.fn().mockResolvedValue(0),
        incrementarVisualizacoes: vi.fn().mockResolvedValue(null),
        atualizar: vi.fn(),
        atualizarECriarPartidas: vi.fn(),
        excluir: vi.fn(),
        contarPorDono: vi.fn().mockResolvedValue(0),
        removerAnfitriaoDoUsuario: vi.fn().mockResolvedValue(0),
        ...overrides,
    };
}

export function criarMockLigaGateway(overrides: Partial<LigaGateway> = {}): LigaGateway {
    return {
        salvar: vi.fn(),
        buscarPorId: vi.fn().mockResolvedValue(null),
        buscarPorTorneioIds: vi.fn().mockResolvedValue([]),
        listar: vi.fn().mockResolvedValue([]),
        listarTotal: vi.fn().mockResolvedValue(0),
        atualizar: vi.fn(),
        excluir: vi.fn(),
        ...overrides,
    };
}

export function criarMockInscricaoGateway(overrides: Partial<InscricaoGateway> = {}): InscricaoGateway {
    return {
        salvar: vi.fn(),
        buscarPorTorneioEUsuario: vi.fn().mockResolvedValue(null),
        listarPorTorneio: vi.fn().mockResolvedValue([]),
        listarPorTorneios: vi.fn().mockResolvedValue([]),
        listarPorUsuario: vi.fn().mockResolvedValue([]),
        atualizar: vi.fn(),
        contarPorTorneios: vi.fn().mockResolvedValue({}),
        contarJogadoresDistintos: vi.fn().mockResolvedValue(0),
        excluir: vi.fn(),
        excluirPorUsuario: vi.fn().mockResolvedValue(0),
        ...overrides,
    };
}

export function criarMockPartidaGateway(overrides: Partial<PartidaGateway> = {}): PartidaGateway {
    return {
        salvar: vi.fn(),
        salvarVarias: vi.fn(),
        buscarPorId: vi.fn().mockResolvedValue(null),
        listarPorTorneio: vi.fn().mockResolvedValue([]),
        listarPorTorneios: vi.fn().mockResolvedValue([]),
        listarPorTorneioERodada: vi.fn().mockResolvedValue([]),
        listarPorJogadorETorneio: vi.fn().mockResolvedValue([]),
        listarPorDeckIds: vi.fn().mockResolvedValue([]),
        atualizar: vi.fn(),
        finalizarAtomicamente: vi.fn().mockResolvedValue(null),
        contestarPartida: vi.fn().mockResolvedValue(null),
        existePartidaRodadaPosterior: vi.fn().mockResolvedValue(false),
        ajustarResultadoContestado: vi.fn().mockResolvedValue(null),
        atualizarJogador2Partida: vi.fn().mockResolvedValue(null),
        excluirPorTorneioERodada: vi.fn().mockResolvedValue(0),
        excluirPorIds: vi.fn().mockResolvedValue(0),
        buscarByePartidaRodada: vi.fn().mockResolvedValue(null),
        confirmarResultado: vi.fn().mockResolvedValue(null),
        atualizarMesa: vi.fn().mockResolvedValue(null),
        ...overrides,
    };
}

export function criarMockLinkIngressoGateway(overrides: Partial<LinkIngressoGateway> = {}): LinkIngressoGateway {
    return {
        salvar: vi.fn(),
        buscarPorToken: vi.fn().mockResolvedValue(null),
        excluirPorToken: vi.fn(),
        ...overrides,
    };
}

export function criarMockTokenBlacklistGateway(overrides: Partial<TokenBlacklistGateway> = {}): TokenBlacklistGateway {
    return {
        adicionar: vi.fn(),
        existe: vi.fn().mockResolvedValue(false),
        ...overrides,
    };
}

export function criarMockLoginAttemptGateway(overrides: Partial<LoginAttemptGateway> = {}): LoginAttemptGateway {
    return {
        registrarFalha: vi.fn(),
        obterFalhas: vi.fn().mockResolvedValue(0),
        resetar: vi.fn(),
        ...overrides,
    };
}

export function criarMockRefreshTokenGateway(overrides: Partial<RefreshTokenGateway> = {}): RefreshTokenGateway {
    return {
        salvar: vi.fn(),
        consumir: vi.fn().mockResolvedValue(null),
        excluirPorUsuario: vi.fn(),
        ...overrides,
    };
}

export function criarMockEmailGateway(overrides: Partial<EmailGateway> = {}): EmailGateway {
    return {
        enviar: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

export function criarMockResetSenhaGateway(overrides: Partial<ResetSenhaGateway> = {}): ResetSenhaGateway {
    return {
        salvar: vi.fn(),
        buscarPorToken: vi.fn().mockResolvedValue(null),
        excluirPorToken: vi.fn(),
        excluirPorUsuario: vi.fn(),
        ...overrides,
    };
}

export function criarMockImagemGateway(overrides: Partial<ImagemGateway> = {}): ImagemGateway {
    return {
        gerarUrlUpload: vi.fn().mockResolvedValue({
            uploadUrl: "https://bucket.s3.us-east-1.amazonaws.com/imagens/user-1/abc.jpeg?sig=x",
            urlPublica: "https://bucket.s3.us-east-1.amazonaws.com/imagens/user-1/abc.jpeg",
        }),
        excluirPorUrl: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

export function criarMockTimeGateway(overrides: Partial<TimeGateway> = {}): TimeGateway {
    return {
        salvar: vi.fn(),
        buscarPorId: vi.fn().mockResolvedValue(null),
        buscarVarios: vi.fn().mockResolvedValue([]),
        buscarPorMembros: vi.fn().mockResolvedValue([]),
        buscarPorConviteToken: vi.fn().mockResolvedValue(null),
        listar: vi.fn().mockResolvedValue([]),
        listarTotal: vi.fn().mockResolvedValue(0),
        atualizar: vi.fn(),
        excluir: vi.fn(),
        ...overrides,
    };
}

export function criarMockStoryFundoGateway(overrides: Partial<import("../../src/dominio/gateway/storyFundoGateway").StoryFundoGateway> = {}) {
    return {
        salvar: vi.fn(),
        listar: vi.fn().mockResolvedValue([]),
        buscarPorId: vi.fn().mockResolvedValue(null),
        excluir: vi.fn().mockResolvedValue(false),
        ...overrides,
    };
}
