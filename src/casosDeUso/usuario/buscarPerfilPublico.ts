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

export class BuscarPerfilPublico implements CasoDeUso<{ id: string }, BuscarPerfilPublicoOutputDto> {
  private constructor(
    private readonly usuarioGateway: UsuarioGateway,
    private readonly deckGateway: DeckGateway,
    private readonly partidaGateway: PartidaGateway,
    private readonly torneioGateway: TorneioGateway,
  ) {}

  public static criar(usuarioGateway: UsuarioGateway, deckGateway: DeckGateway, partidaGateway: PartidaGateway, torneioGateway: TorneioGateway) {
    return new BuscarPerfilPublico(usuarioGateway, deckGateway, partidaGateway, torneioGateway);
  }

  public async executar({ id }: { id: string }): Promise<BuscarPerfilPublicoOutputDto> {
    const usuario = await this.usuarioGateway.buscarPorId(id);
    if (!usuario || usuario.excluido) {
      throw ErroPersonalizado.criar({ mensagem: "Usuário não encontrado", status: 404 });
    }

    const decksDoUsuario = await this.deckGateway.listar({ usuarioId: id, incluirOcultos: true });
    const decksPublicos = decksDoUsuario.filter((deck) => !deck.oculto && !deck.travado);
    const deckIds = new Set(decksDoUsuario.map((deck) => deck.id));
    const partidas = await this.partidaGateway.listarPorDeckIds(Array.from(deckIds));

    let vitorias = 0;
    let derrotas = 0;
    let empates = 0;
    for (const partida of partidas) {
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

    const totalPartidas = vitorias + derrotas + empates;
    const torneioIds = Array.from(new Set(partidas.map((partida) => partida.torneioId)));
    const torneios = (await Promise.all(torneioIds.map((torneioId) => this.torneioGateway.buscarPorId(torneioId))))
      .filter((torneio) => torneio?.status === "finalizado" && !torneio.secreto)
      .sort((a, b) => b!.horario.getTime() - a!.horario.getTime())
      .slice(0, 3);
    const ultimosTorneios = torneios.map((torneio) => {
      let wins = 0;
      let losses = 0;
      let draws = 0;
      for (const partida of partidas) {
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
    return {
      usuario: { id: usuario.id, nome: usuario.nome, nickMTGO: usuario.nickMTGO, nickArena: usuario.nickArena, fotoUrl: usuario.fotoUrl, resultadosExpressivos: usuario.resultadosExpressivos, criadoEm: usuario.criadoEm },
      estatisticas: { vitorias, derrotas, empates, totalPartidas, winrate: totalPartidas ? Math.round((vitorias / totalPartidas) * 1000) / 10 : 0 },
      ultimosTorneios,
      decks: decksPublicos.map((deck) => ({ id: deck.id, nome: deck.nome, formato: deck.formato, cartaRepresentativa: deck.cartaRepresentativa, cartaFundo: deck.cartaRepresentativa || deck.maindeck[0]?.nome || deck.commander[0]?.nome || null, visualizacoes: deck.visualizacoes, criadoEm: deck.criadoEm })),
    };
  }
}
