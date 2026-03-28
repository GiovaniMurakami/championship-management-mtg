import { UsuarioGateway } from "../../src/dominio/gateway/usuarioGateway";
import { DeckGateway, FiltrosListarDecks } from "../../src/dominio/gateway/deckGateway";
import { TorneioGateway } from "../../src/dominio/gateway/torneioGateway";
import { InscricaoGateway } from "../../src/dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../src/dominio/gateway/partidaGateway";
import { ChatGptGateway } from "../../src/dominio/gateway/chatGptGateway";

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
        atualizar: jest.fn(),
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
