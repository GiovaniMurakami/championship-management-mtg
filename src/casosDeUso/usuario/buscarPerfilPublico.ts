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
    };
  }
}
