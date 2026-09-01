import { Carta, Deck } from "../../../dominio/entidade/deck";
import { DeckGateway, FiltrosListarDecks } from "../../../dominio/gateway/deckGateway";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

type DeckItem = {
  id: string;
  nome: string;
  nomeConsolidado?: string | null;
  cartaRepresentativa?: string | null;
  formato: string;
  linkLigaMagic?: string | null;
  maindeck: Carta[];
  sideboard: Carta[];
  commander: Carta[];
  usuarioId: string;
  visualizacoes: number;
  oculto: boolean;
  travado: boolean;
  torneioId?: string | null;
  deckOriginalId?: string | null;
  criadoEm: string;
};

const DECKS_PK = "DECKS";

export class DeckDynamoRepositorio extends BaseDynamoRepositorio implements DeckGateway {
  private constructor() {
    super();
  }

  public static criar() {
    return new DeckDynamoRepositorio();
  }

  public async salvar(deck: Deck): Promise<void> {
    await this.salvarIndices(this.deckParaItem(deck));
  }

  public async buscarPorId(id: string): Promise<Deck | null> {
    const item = await this.getJson<DeckItem>(`DECK#${id}`, "DATA");
    return item ? this.itemParaDeck(item) : null;
  }

  public async buscarPorPrefixo(prefixo: string): Promise<Deck | null> {
    const itens = await this.queryJson<DeckItem>(DECKS_PK);
    const encontrados = itens.filter((item) => item.id.toLowerCase().startsWith(prefixo.toLowerCase()));
    return encontrados.length === 1 ? this.itemParaDeck(encontrados[0]) : null;
  }

  public async buscarVarios(ids: string[]): Promise<Deck[]> {
    const decks = await Promise.all(Array.from(new Set(ids)).map((id) => this.buscarPorId(id)));
    return decks.filter((deck): deck is Deck => deck !== null);
  }

  public async listarPorUsuario(usuarioId: string): Promise<Deck[]> {
    const itens = await this.queryJson<DeckItem>(`USER#${usuarioId}`);
    return itens
      .filter((item) => item.id && item.formato && !item.oculto)
      .map((item) => this.itemParaDeck(item));
  }

  public async listarPorDeckOriginalId(deckOriginalId: string): Promise<Deck[]> {
    const itens = await this.queryJson<DeckItem>(`DECK_ORIGINAL#${deckOriginalId}`);
    return itens.map((item) => this.itemParaDeck(item));
  }

  public async listar(filtros: FiltrosListarDecks): Promise<Deck[]> {
    const itens = await this.carregarBase(filtros);
    const filtrados = this.filtrar(itens, filtros)
      .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime() || a.id.localeCompare(b.id));
    const offset = filtros.offset ?? 0;
    const limite = filtros.limite ?? filtrados.length;
    return filtrados.slice(offset, offset + limite).map((item) => this.itemParaDeck(item));
  }

  public async listarTotal(filtros: Pick<FiltrosListarDecks, "usuarioId" | "usuarioIds" | "formato" | "nome" | "incluirOcultos"> = {}): Promise<number> {
    return this.filtrar(await this.carregarBase(filtros), filtros).length;
  }

  public async atualizar(deck: Deck): Promise<void> {
    const anterior = await this.buscarPorId(deck.id);
    const atual = this.deckParaItem(deck);
    const requests = this.requestsSalvarIndices(atual);
    if (anterior) {
      const antigo = this.deckParaItem(anterior);
      if (this.skDeck(antigo) !== this.skDeck(atual)) requests.push(this.toDeleteRequest(DECKS_PK, this.skDeck(antigo)));
      if (antigo.usuarioId !== atual.usuarioId) requests.push(this.toDeleteRequest(`USER#${antigo.usuarioId}`, `DECK#${antigo.id}`));
      if (antigo.deckOriginalId && antigo.deckOriginalId !== atual.deckOriginalId) {
        requests.push(this.toDeleteRequest(`DECK_ORIGINAL#${antigo.deckOriginalId}`, `DECK#${antigo.id}`));
      }
    }
    await this.transactWriteRequests(requests);
  }

  public async incrementarVisualizacoes(id: string): Promise<Deck | null> {
    const deck = await this.buscarPorId(id);
    if (!deck) return null;
    const item = this.deckParaItem(deck);
    const chaves = [
      { pk: `DECK#${item.id}`, sk: "DATA" },
      { pk: DECKS_PK, sk: this.skDeck(item) },
      { pk: `USER#${item.usuarioId}`, sk: `DECK#${item.id}` },
      ...(item.deckOriginalId ? [{ pk: `DECK_ORIGINAL#${item.deckOriginalId}`, sk: `DECK#${item.id}` }] : []),
    ];
    await this.transactWrite(chaves.map(({ pk, sk }) => ({
      Update: {
        TableName: this.tabela,
        Key: { pk: { S: pk }, sk: { S: sk } },
        UpdateExpression: "SET visualizacoes = if_not_exists(visualizacoes, :base) + :incremento",
        ExpressionAttributeValues: {
          ":base": { N: String(item.visualizacoes) },
          ":incremento": { N: "1" },
        },
        ConditionExpression: "attribute_exists(pk)",
      },
    })));
    return this.buscarPorId(id);
  }

  public async excluir(id: string): Promise<void> {
    const deck = await this.buscarPorId(id);
    if (!deck) return;
    await this.removerIndices(this.deckParaItem(deck));
  }

  public async excluirPorUsuario(usuarioId: string): Promise<number> {
    const decks = await this.listar({ usuarioId, incluirOcultos: true });
    await Promise.all(decks.map((deck) => this.excluir(deck.id)));
    return decks.length;
  }

  private async carregarBase(filtros: Pick<FiltrosListarDecks, "usuarioId" | "usuarioIds">): Promise<DeckItem[]> {
    if (filtros.usuarioId) {
      return (await this.queryJson<DeckItem>(`USER#${filtros.usuarioId}`)).filter((item) => item.id && item.formato);
    }
    if (filtros.usuarioIds?.length) {
      const listas = await Promise.all(filtros.usuarioIds.map((usuarioId) => this.queryJson<DeckItem>(`USER#${usuarioId}`)));
      return listas.flat().filter((item) => item.id && item.formato);
    }
    return this.queryJson<DeckItem>(DECKS_PK);
  }

  private filtrar(
    itens: DeckItem[],
    filtros: Pick<FiltrosListarDecks, "formato" | "nome" | "incluirOcultos" | "criadoApos" | "criadoAntes">
  ): DeckItem[] {
    const formato = filtros.formato?.trim().toLowerCase();
    const nome = filtros.nome?.trim().toLowerCase();
    return itens.filter((item) => {
      if (!filtros.incluirOcultos && item.oculto) return false;
      if (formato && !item.formato.toLowerCase().includes(formato)) return false;
      if (nome && !item.nome.toLowerCase().includes(nome)) return false;
      const criadoEm = new Date(item.criadoEm).getTime();
      if (filtros.criadoApos && criadoEm < filtros.criadoApos.getTime()) return false;
      if (filtros.criadoAntes && criadoEm > filtros.criadoAntes.getTime()) return false;
      return true;
    });
  }

  private async salvarIndices(item: DeckItem): Promise<void> {
    await this.transactWriteRequests(this.requestsSalvarIndices(item));
  }

  private requestsSalvarIndices(item: DeckItem) {
    const requests = [
      this.toPutRequest(`DECK#${item.id}`, "DATA", item, { entity: "DECK", visualizacoes: item.visualizacoes }),
      this.toPutRequest(DECKS_PK, this.skDeck(item), item, { entity: "DECK_INDEX", visualizacoes: item.visualizacoes }),
      this.toPutRequest(`USER#${item.usuarioId}`, `DECK#${item.id}`, item, { entity: "DECK_USUARIO", visualizacoes: item.visualizacoes }),
    ];
    if (item.deckOriginalId) {
      requests.push(this.toPutRequest(`DECK_ORIGINAL#${item.deckOriginalId}`, `DECK#${item.id}`, item, { entity: "DECK_ORIGINAL_INDEX", visualizacoes: item.visualizacoes }));
    }
    return requests;
  }

  private async removerIndices(item: DeckItem): Promise<void> {
    const requests = [
      this.toDeleteRequest(`DECK#${item.id}`, "DATA"),
      this.toDeleteRequest(DECKS_PK, this.skDeck(item)),
      this.toDeleteRequest(`USER#${item.usuarioId}`, `DECK#${item.id}`),
    ];
    if (item.deckOriginalId) {
      requests.push(this.toDeleteRequest(`DECK_ORIGINAL#${item.deckOriginalId}`, `DECK#${item.id}`));
    }
    await this.transactWriteRequests(requests);
  }

  private skDeck(item: DeckItem): string {
    return `DECK#${item.criadoEm}#${item.id}`;
  }

  private deckParaItem(deck: Deck): DeckItem {
    return {
      id: deck.id,
      nome: deck.nome,
      nomeConsolidado: deck.nomeConsolidado,
      cartaRepresentativa: deck.cartaRepresentativa,
      formato: deck.formato,
      linkLigaMagic: deck.linkLigaMagic,
      maindeck: deck.maindeck,
      sideboard: deck.sideboard,
      commander: deck.commander,
      usuarioId: deck.usuarioId,
      visualizacoes: deck.visualizacoes,
      oculto: deck.oculto,
      travado: deck.travado,
      torneioId: deck.torneioId,
      deckOriginalId: deck.deckOriginalId,
      criadoEm: deck.criadoEm.toISOString(),
    };
  }

  private itemParaDeck(item: DeckItem): Deck {
    return new Deck({
      id: item.id,
      nome: item.nome,
      nomeConsolidado: item.nomeConsolidado,
      cartaRepresentativa: item.cartaRepresentativa,
      formato: item.formato,
      linkLigaMagic: item.linkLigaMagic,
      maindeck: item.maindeck,
      sideboard: item.sideboard,
      commander: item.commander,
      usuarioId: item.usuarioId,
      visualizacoes: item.visualizacoes,
      oculto: item.oculto,
      travado: item.travado,
      torneioId: item.torneioId,
      deckOriginalId: item.deckOriginalId,
      criadoEm: new Date(item.criadoEm),
    });
  }
}
