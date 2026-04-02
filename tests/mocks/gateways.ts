import { UsuarioGateway } from "../../src/dominio/gateway/usuarioGateway";
import { TokenBlacklistGateway } from "../../src/dominio/gateway/tokenBlacklistGateway";
import { DeckGateway } from "../../src/dominio/gateway/deckGateway";
import { TorneioGateway } from "../../src/dominio/gateway/torneioGateway";
import { InscricaoGateway } from "../../src/dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../src/dominio/gateway/partidaGateway";
import { ChatGptGateway } from "../../src/dominio/gateway/chatGptGateway";
import { LigaGateway } from "../../src/dominio/gateway/ligaGateway";
import { LoginAttemptGateway } from "../../src/dominio/gateway/loginAttemptGateway";
import { RefreshTokenGateway } from "../../src/dominio/gateway/refreshTokenGateway";

export function criarMockUsuarioGateway(overrides: Partial<UsuarioGateway> = {}): UsuarioGateway {
    return {
        salvar: jest.fn(),
        buscarPorEmail: jest.fn().mockResolvedValue(null),
        buscarPorId: jest.fn().mockResolvedValue(null),
        buscarVarios: jest.fn().mockResolvedValue([]),
        atualizar: jest.fn(),
        ...overrides,
    };
}

export function criarMockDeckGateway(overrides: Partial<DeckGateway> = {}): DeckGateway {
    return {
        salvar: jest.fn(),
        buscarPorId: jest.fn().mockResolvedValue(null),
        buscarVarios: jest.fn().mockResolvedValue([]),
        listarPorUsuario: jest.fn().mockResolvedValue([]),
        listar: jest.fn().mockResolvedValue([]),
        listarTotal: jest.fn().mockResolvedValue(0),
        atualizar: jest.fn(),
        excluir: jest.fn(),
        ...overrides,
    };
}

export function criarMockTorneioGateway(overrides: Partial<TorneioGateway> = {}): TorneioGateway {
    return {
        salvar: jest.fn(),
        buscarPorId: jest.fn().mockResolvedValue(null),
        listar: jest.fn().mockResolvedValue([]),
        listarTotal: jest.fn().mockResolvedValue(0),
        atualizar: jest.fn(),
        excluir: jest.fn(),
        ...overrides,
    };
}

export function criarMockLigaGateway(overrides: Partial<LigaGateway> = {}): LigaGateway {
    return {
        salvar: jest.fn(),
        buscarPorId: jest.fn().mockResolvedValue(null),
        listar: jest.fn().mockResolvedValue([]),
        listarTotal: jest.fn().mockResolvedValue(0),
        atualizar: jest.fn(),
        excluir: jest.fn(),
        ...overrides,
    };
}

export function criarMockInscricaoGateway(overrides: Partial<InscricaoGateway> = {}): InscricaoGateway {
    return {
        salvar: jest.fn(),
        buscarPorTorneioEUsuario: jest.fn().mockResolvedValue(null),
        listarPorTorneio: jest.fn().mockResolvedValue([]),
        listarPorUsuario: jest.fn().mockResolvedValue([]),
        atualizar: jest.fn(),
        contarPorTorneios: jest.fn().mockResolvedValue({}),
        excluir: jest.fn(),
        ...overrides,
    };
}

export function criarMockPartidaGateway(overrides: Partial<PartidaGateway> = {}): PartidaGateway {
    return {
        salvar: jest.fn(),
        salvarVarias: jest.fn(),
        buscarPorId: jest.fn().mockResolvedValue(null),
        listarPorTorneio: jest.fn().mockResolvedValue([]),
        listarPorTorneioERodada: jest.fn().mockResolvedValue([]),
        listarPorJogadorETorneio: jest.fn().mockResolvedValue([]),
        atualizar: jest.fn(),
        ...overrides,
    };
}

export function criarMockChatGptGateway(overrides: Partial<ChatGptGateway> = {}): ChatGptGateway {
    return {
        obterNomeConsolidado: jest.fn().mockResolvedValue("Burn"),
        ...overrides,
    };
}

export function criarMockTokenBlacklistGateway(overrides: Partial<TokenBlacklistGateway> = {}): TokenBlacklistGateway {
    return {
        adicionar: jest.fn(),
        existe: jest.fn().mockResolvedValue(false),
        ...overrides,
    };
}

export function criarMockLoginAttemptGateway(overrides: Partial<LoginAttemptGateway> = {}): LoginAttemptGateway {
    return {
        registrarFalha: jest.fn(),
        obterFalhas: jest.fn().mockResolvedValue(0),
        resetar: jest.fn(),
        ...overrides,
    };
}

export function criarMockRefreshTokenGateway(overrides: Partial<RefreshTokenGateway> = {}): RefreshTokenGateway {
    return {
        salvar: jest.fn(),
        consumir: jest.fn().mockResolvedValue(null),
        excluirPorUsuario: jest.fn(),
        ...overrides,
    };
}
