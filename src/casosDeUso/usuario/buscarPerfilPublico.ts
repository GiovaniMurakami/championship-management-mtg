import { Deck } from "../../dominio/entidade/deck";
import { Partida } from "../../dominio/entidade/partida";
import { IntervaloDatas, resolverIntervaloDatas } from "../../helpers/data/intervaloDatas";
import { PartidaExterna, PartidaExternaGateway } from "../../dominio/gateway/partidaExternaGateway";
import { DeckGateway } from "../../dominio/gateway/deckGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { CasoDeUso } from "../casoDeUso";

export type BuscarPerfilPublicoOutputDto = {
  usuario: {
    id: string;
    nome: string;
    nickMTGO?: string;
    nickArena?: string;
    fotoUrl?: string;
    resultadosExpressivos: number;
    criadoEm: Date;
  };
  estatisticas: {
    vitorias: number;
    derrotas: number;
    empates: number;
    totalPartidas: number;
    winrate: number;
  };
  paginacaoPartidasExternas: { pagina: number; total: number; totalPaginas: number; limite: number };
  partidasExternas: Array<Omit<PartidaExterna, "usuarioId">>;
  ultimosTorneios: Array<{
    id: string;
    nome: string;
    formato: string;
    horario: Date;
    vitorias: number;
    derrotas: number;
    empates: number;
    totalPartidas: number;
    winrate: number;
  }>;
  decks: Array<{
    id: string;
    nome: string;
    formato: string;
    cartaRepresentativa: string | null;
    cartaFundo: string | null;
    visualizacoes: number;
    criadoEm: Date;
  }>;
  matrizConfrontos: MatrizConfrontosPerfil;
};

export class BuscarPerfilPublico implements CasoDeUso<{ id: string; paginaPartidasExternas?: number } & IntervaloDatas, BuscarPerfilPublicoOutputDto> {
  private constructor(
    private readonly usuarioGateway: UsuarioGateway,
    private readonly deckGateway: DeckGateway,
    private readonly partidaGateway: PartidaGateway,
    private readonly torneioGateway: TorneioGateway,
    private readonly partidasExternas?: PartidaExternaGateway,
  ) {}

  public static criar(usuarioGateway: UsuarioGateway, deckGateway: DeckGateway, partidaGateway: PartidaGateway, torneioGateway: TorneioGateway, partidasExternas?: PartidaExternaGateway) {
    return new BuscarPerfilPublico(usuarioGateway, deckGateway, partidaGateway, torneioGateway, partidasExternas);
  }

  public async executar({ id, paginaPartidasExternas = 1, dataInicio, dataFim }: { id: string; paginaPartidasExternas?: number } & IntervaloDatas): Promise<BuscarPerfilPublicoOutputDto> {
    const intervalo = resolverIntervaloDatas({ dataInicio, dataFim });
    const usuario = await this.usuarioGateway.buscarPorId(id);
    if (!usuario || usuario.excluido) {
      throw ErroPersonalizado.criar({ mensagem: "Usuário não encontrado", status: 404 });
    }

    const decksDoUsuario = await this.deckGateway.listar({ usuarioId: id, incluirOcultos: true });
    const decksPublicos = decksDoUsuario.filter((deck) => !deck.oculto && !deck.travado);
    const deckIds = new Set(decksDoUsuario.map((deck) => deck.id));
    const partidasDosDecks = await this.partidaGateway.listarPorDeckIds(Array.from(deckIds));
    // Usar um deck do usuário não comprova participação; BYEs e partidas pendentes
    // também não compõem o histórico de resultados do perfil.
    const partidas = partidasDosDecks.filter(partida =>
      partida.status === "finalizada" && partida.jogador2Id &&
      (partida.jogador1Id === id || partida.jogador2Id === id)
    );

    const torneioIds = Array.from(new Set(partidas.map(partida => partida.torneioId)));
    const todosTorneios = await Promise.all(torneioIds.map(torneioId => this.torneioGateway.buscarPorId(torneioId)));
    const idsNoPeriodo = new Set(todosTorneios.filter(t => t && (!intervalo || (t.horario >= intervalo.dataInicio && t.horario <= intervalo.dataFim))).map(t => t!.id));
    const partidasNoPeriodo = intervalo ? partidas.filter(p => idsNoPeriodo.has(p.torneioId)) : partidas;
    let vitorias = 0;
    let derrotas = 0;
    let empates = 0;
    for (const partida of partidasNoPeriodo) {
      if (partida.status !== "finalizada" || !partida.jogador2Id) continue;
      const comoJogador1 = partida.jogador1Id === id;
      const comoJogador2 = partida.jogador2Id === id;
      if (!comoJogador1 && !comoJogador2) continue;
      const proprias = comoJogador1 ? partida.vitoriasJogador1 : partida.vitoriasJogador2;
      const oponente = comoJogador1 ? partida.vitoriasJogador2 : partida.vitoriasJogador1;
      if (proprias > oponente) vitorias += 1;
      else if (proprias < oponente) derrotas += 1;
      else empates += 1;
    }

    if (!Number.isSafeInteger(paginaPartidasExternas) || paginaPartidasExternas < 1) {
      throw ErroPersonalizado.criar({ mensagem: "Página inválida.", status: 400 });
    }
    const externas = (await this.partidasExternas?.listarPorUsuario(id) ?? []).filter(p => !intervalo || (p.data >= dataInicio! && p.data <= dataFim!));
    for (const partida of externas) {
      if (partida.resultado === "vitoria") vitorias++;
      else if (partida.resultado === "derrota") derrotas++;
      else empates++;
    }
    const totalPartidas = vitorias + derrotas + empates;
    const torneios = todosTorneios
      .filter(t => t && idsNoPeriodo.has(t.id))
      .filter((torneio) => torneio?.status === "finalizado" && !torneio.secreto)
      .sort((a, b) => b!.horario.getTime() - a!.horario.getTime())
      .slice(0, 3);
    const ultimosTorneios = torneios.map((torneio) => {
      let wins = 0;
      let losses = 0;
      let draws = 0;
      for (const partida of partidasNoPeriodo) {
        if (partida.torneioId !== torneio!.id || partida.status !== "finalizada" || !partida.jogador2Id) continue;
        const comoJogador1 = partida.jogador1Id === id;
        const comoJogador2 = partida.jogador2Id === id;
        if (!comoJogador1 && !comoJogador2) continue;
        const proprias = comoJogador1 ? partida.vitoriasJogador1 : partida.vitoriasJogador2;
        const oponente = comoJogador1 ? partida.vitoriasJogador2 : partida.vitoriasJogador1;
        if (proprias > oponente) wins += 1;
        else if (proprias < oponente) losses += 1;
        else draws += 1;
      }
      const total = wins + losses + draws;
      return { id: torneio!.id, nome: torneio!.nome, formato: torneio!.formato, horario: torneio!.horario, vitorias: wins, derrotas: losses, empates: draws, totalPartidas: total, winrate: total ? Math.round((wins / total) * 1000) / 10 : 0 };
    });
    const idsFaltando = [...new Set(partidasNoPeriodo.flatMap((partida) => [partida.deckJogador1Id, partida.deckJogador2Id].filter((deckId): deckId is string => Boolean(deckId))))]
      .filter((deckId) => !decksDoUsuario.some((deck) => deck.id === deckId));
    const extras = idsFaltando.length > 0 ? await this.deckGateway.buscarVarios(idsFaltando) : [];
    const matrizConfrontos = montarMatrizConfrontos({
      usuarioId: id,
      partidas: partidasNoPeriodo,
      externas,
      decks: new Map([...decksDoUsuario, ...extras].map((deck) => [deck.id, deck])),
    });

    const limite = 10;
    const totalPaginas = Math.max(1, Math.ceil(externas.length / limite));
    const pagina = Math.min(paginaPartidasExternas, totalPaginas);
    return {
      paginacaoPartidasExternas: { pagina, limite, total: externas.length, totalPaginas },
      usuario: { id: usuario.id, nome: usuario.nome, nickMTGO: usuario.nickMTGO, nickArena: usuario.nickArena, fotoUrl: usuario.fotoUrl, resultadosExpressivos: usuario.resultadosExpressivos, criadoEm: usuario.criadoEm },
      estatisticas: { vitorias, derrotas, empates, totalPartidas, winrate: totalPartidas ? Math.round((vitorias / totalPartidas) * 1000) / 10 : 0 },
      partidasExternas: [...externas]
        .sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || "") || b.data.localeCompare(a.data) || a.id.localeCompare(b.id))
        .slice((pagina - 1) * limite, pagina * limite)
        .map(({ id, resultado, data, oponente, campeonato, deckNome, deckAdversarioNome }) => ({ id, resultado, data, oponente, campeonato, deckNome, deckAdversarioNome })),
      ultimosTorneios,
      decks: decksPublicos.map((deck) => ({ id: deck.id, nome: deck.nome, formato: deck.formato, cartaRepresentativa: deck.cartaRepresentativa, cartaFundo: deck.cartaRepresentativa || deck.maindeck[0]?.nome || deck.commander[0]?.nome || null, visualizacoes: deck.visualizacoes, criadoEm: deck.criadoEm })),
      matrizConfrontos,
    };
  }
}

type Acumulo = { vitorias: number; derrotas: number; empates: number };

export type CelulaConfronto = Acumulo & { partidas: number; winrate: number };

export type LinhaConfronto = CelulaConfronto & {
  nome: string;
  confrontos: Array<CelulaConfronto & { nome: string }>;
};

export type MatrizConfrontosPerfil = {
  adversarios: string[];
  linhas: LinhaConfronto[];
};

function rotuloDeck(valor?: string | null) {
  const limpo = String(valor || "").replace(/\s+/g, " ").trim();
  return limpo || "Não informado";
}

function nomeExibicao(deck?: Deck) {
  return rotuloDeck(deck?.nomeConsolidado || deck?.nome);
}

function publicarAcumulo(acumulo: Acumulo): CelulaConfronto {
  const partidas = acumulo.vitorias + acumulo.derrotas + acumulo.empates;
  return {
    ...acumulo,
    partidas,
    winrate: partidas ? Math.round((acumulo.vitorias / partidas) * 1000) / 10 : 0,
  };
}

function montarMatrizConfrontos({
  usuarioId,
  partidas,
  externas,
  decks,
}: {
  usuarioId: string;
  partidas: Partida[];
  externas: PartidaExterna[];
  decks: Map<string, Deck>;
}): MatrizConfrontosPerfil {
  const porPar = new Map<string, Acumulo>();
  const porDeck = new Map<string, Acumulo>();
  const rotulos = new Map<string, string>();

  const registrar = (deck: string, adversario: string, tipo: keyof Acumulo) => {
    if (deck === "Não informado" && adversario === "Não informado") return;
    const chaveDeck = deck.toLowerCase();
    const chaveAdversario = adversario.toLowerCase();
    if (!rotulos.has(chaveDeck)) rotulos.set(chaveDeck, deck);
    if (!rotulos.has(chaveAdversario)) rotulos.set(chaveAdversario, adversario);
    const geral = porDeck.get(chaveDeck) ?? { vitorias: 0, derrotas: 0, empates: 0 };
    geral[tipo] += 1;
    porDeck.set(chaveDeck, geral);
    const par = porPar.get(`${chaveDeck}\u0000${chaveAdversario}`) ?? { vitorias: 0, derrotas: 0, empates: 0 };
    par[tipo] += 1;
    porPar.set(`${chaveDeck}\u0000${chaveAdversario}`, par);
  };

  for (const partida of partidas) {
    const meuLado = partida.jogador1Id === usuarioId;
    const meuDeckId = meuLado ? partida.deckJogador1Id : partida.deckJogador2Id;
    const deckAdversarioId = meuLado ? partida.deckJogador2Id : partida.deckJogador1Id;
    const proprias = meuLado ? partida.vitoriasJogador1 : partida.vitoriasJogador2;
    const doAdversario = meuLado ? partida.vitoriasJogador2 : partida.vitoriasJogador1;
    const tipo: keyof Acumulo = proprias > doAdversario ? "vitorias" : proprias < doAdversario ? "derrotas" : "empates";
    registrar(
      meuDeckId ? nomeExibicao(decks.get(meuDeckId)) : "Não informado",
      deckAdversarioId ? nomeExibicao(decks.get(deckAdversarioId)) : "Não informado",
      tipo,
    );
  }

  for (const externa of externas) {
    const tipo: keyof Acumulo = externa.resultado === "vitoria" ? "vitorias" : externa.resultado === "derrota" ? "derrotas" : "empates";
    registrar(rotuloDeck(externa.deckNome), rotuloDeck(externa.deckAdversarioNome), tipo);
  }

  const partidasDo = (chave: string) => {
    const item = porDeck.get(chave);
    return item ? item.vitorias + item.derrotas + item.empates : 0;
  };
  const partidasContra = (adversario: string) => [...porPar.entries()]
    .filter(([chave]) => chave.endsWith(`\u0000${adversario}`))
    .reduce((total, [, item]) => total + item.vitorias + item.derrotas + item.empates, 0);

  const decksOrdenados = [...porDeck.keys()].sort((a, b) => partidasDo(b) - partidasDo(a) || (rotulos.get(a) || a).localeCompare(rotulos.get(b) || b, "pt-BR"));
  const adversarios = [...new Set([...porPar.keys()].map((chave) => chave.split("\u0000")[1]))]
    .sort((a, b) => partidasContra(b) - partidasContra(a) || (rotulos.get(a) || a).localeCompare(rotulos.get(b) || b, "pt-BR"));

  return {
    adversarios: adversarios.map((chave) => rotulos.get(chave) || chave),
    linhas: decksOrdenados.map((deck) => ({
      nome: rotulos.get(deck) || deck,
      ...publicarAcumulo(porDeck.get(deck)!),
      confrontos: adversarios.map((adversario) => ({
        nome: rotulos.get(adversario) || adversario,
        ...publicarAcumulo(porPar.get(`${deck}\u0000${adversario}`) ?? { vitorias: 0, derrotas: 0, empates: 0 }),
      })),
    })),
  };
}
