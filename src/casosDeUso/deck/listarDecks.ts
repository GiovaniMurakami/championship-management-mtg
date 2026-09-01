import { Carta } from "../../dominio/entidade/deck";
import { DeckGateway, FiltrosListarDecks } from "../../dominio/gateway/deckGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { normalizarPaginacaoOffset } from "../../helpers/paginacao";
import { toUsuarioPublico } from "../../helpers/torneio/resolverNomeJogador";
import { CasoDeUso } from "../casoDeUso";

const LIMITE_MAXIMO_DECKS = 100;
const LIMITE_PADRAO_DECKS = 20;

export type ListarDecksInputDto = {
  usuarioId?: string;
  formato?: string;
  nome?: string;
  jogador?: string;
  criadoApos?: string;
  criadoAntes?: string;
  limite?: number;
  offset?: number;
  solicitanteId?: string;
};

export type ListarDecksOutputDto = {
  decks: {
    id: string;
    nome: string;
    formato: string;
    linkLigaMagic: string | null;
    maindeck: Carta[];
    sideboard: Carta[];
    commander: Carta[];
    usuario: { id: string; nome: string; excluido: boolean };
    visualizacoes: number;
    criadoEm: Date;
  }[];
  total: number;
  limite: number;
  offset: number;
};

export class ListarDecks
  implements CasoDeUso<ListarDecksInputDto, ListarDecksOutputDto> {
  private constructor(
    private readonly deckGateway: DeckGateway,
    private readonly usuarioGateway: UsuarioGateway
  ) { }

  public static criar(deckGateway: DeckGateway, usuarioGateway: UsuarioGateway) {
    return new ListarDecks(deckGateway, usuarioGateway);
  }

  public async executar(
    input: ListarDecksInputDto
  ): Promise<ListarDecksOutputDto> {
    const { limite, offset } = normalizarPaginacaoOffset(
      input.limite,
      input.offset,
      LIMITE_PADRAO_DECKS,
      LIMITE_MAXIMO_DECKS
    );

    const filtros: FiltrosListarDecks = { limite, offset };
    if (input.usuarioId && input.usuarioId === input.solicitanteId) filtros.incluirOcultos = true;
    if (input.usuarioId) filtros.usuarioId = input.usuarioId;
    if (input.formato) filtros.formato = input.formato;
    if (input.nome) filtros.nome = input.nome;
    if (input.jogador) {
      const usuariosEncontrados = await this.usuarioGateway.listar({ nome: input.jogador });
      filtros.usuarioIds = usuariosEncontrados.map((usuario) => usuario.id);
    }
    if (input.criadoApos) filtros.criadoApos = new Date(input.criadoApos);
    if (input.criadoAntes) filtros.criadoAntes = new Date(input.criadoAntes);

    const [decks, total] = await Promise.all([
      this.deckGateway.listar(filtros),
      this.deckGateway.listarTotal({ usuarioId: filtros.usuarioId, usuarioIds: filtros.usuarioIds, formato: filtros.formato, nome: filtros.nome, incluirOcultos: filtros.incluirOcultos }),
    ]);

    const usuarioIds = [...new Set(decks.map((d) => d.usuarioId))];
    const usuarios = usuarioIds.length > 0
      ? await this.usuarioGateway.buscarVarios(usuarioIds)
      : [];
    const usuarioMap = new Map(usuarios.map((u) => [u.id, u]));

    return {
      decks: decks.map((deck) => ({
        id: deck.id,
        nome: deck.nome,
        formato: deck.formato,
        linkLigaMagic: deck.linkLigaMagic,
        maindeck: deck.maindeck,
        sideboard: deck.sideboard,
        commander: deck.commander,
        usuario: toUsuarioPublico(usuarioMap.get(deck.usuarioId), deck.usuarioId),
        visualizacoes: deck.visualizacoes,
        criadoEm: deck.criadoEm,
        oculto: deck.oculto,
      })),
      total,
      limite,
      offset,
    };
  }
}
