import { Partida } from "../../dominio/entidade/partida";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import {
  calcularEstatisticas,
  ordenarPorDesempate,
  omwp,
  gwp,
  ogwp,
  parKey,
  gerarPareamentos,
} from "./swiss";

export type IniciarProximaRodadaInputDto = {
  torneioId: string;
  donoId: string;
  isAdmin: boolean;
};

export type IniciarProximaRodadaOutputDto =
  | {
    finalizado: false;
    rodadaAtual: number;
    emCorte: boolean;
    partidas: Array<{
      id: string;
      jogador1Id: string;
      jogador1Nome: string;
      jogador2Id: string | null;
      jogador2Nome: string | null;
      deckJogador1Id?: string;
      deckJogador2Id?: string | null;
    }>;
  }
  | {
    finalizado: true;
    classificacao: Array<{
      posicao: number;
      usuarioId: string;
      pontosMesa: number;
      omwp: number;
      gwp: number;
      ogwp: number;
    }>;
  };

export class IniciarProximaRodada
  implements
  CasoDeUso<IniciarProximaRodadaInputDto, IniciarProximaRodadaOutputDto> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly inscricaoGateway: InscricaoGateway,
    private readonly partidaGateway: PartidaGateway,
    private readonly usuarioGateway: UsuarioGateway
  ) { }

  public static criar(
    torneioGateway: TorneioGateway,
    inscricaoGateway: InscricaoGateway,
    partidaGateway: PartidaGateway,
    usuarioGateway: UsuarioGateway
  ) {
    return new IniciarProximaRodada(
      torneioGateway,
      inscricaoGateway,
      partidaGateway,
      usuarioGateway
    );
  }

  public async executar(
    input: IniciarProximaRodadaInputDto
  ): Promise<IniciarProximaRodadaOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (torneio.donoId !== input.donoId && !input.isAdmin) {
      throw ErroPersonalizado.criar({
        mensagem: "Apenas o dono do torneio pode avançar as rodadas.",
        status: StatusErro.erroProibido,
      });
    }

    if (torneio.status !== "em_andamento") {
      throw ErroPersonalizado.criar({
        mensagem:
          "O torneio não está em andamento. Use POST /torneio/:id/iniciar primeiro.",
        status: StatusErro.erroParametro,
      });
    }

    const partidasRodadaAtual =
      await this.partidaGateway.listarPorTorneioERodada(
        input.torneioId,
        torneio.rodadaAtual
      );

    const pendentes = partidasRodadaAtual.filter(
      (p) => p.status === "pendente"
    );
    if (pendentes.length > 0) {
      throw ErroPersonalizado.criar({
        mensagem: `Ainda há ${pendentes.length} partida(s) pendente(s) na rodada ${torneio.rodadaAtual}.`,
        status: StatusErro.erroParametro,
      });
    }

    const todasPartidas = await this.partidaGateway.listarPorTorneio(
      input.torneioId
    );

    const inscricoes = await this.inscricaoGateway.listarPorTorneio(
      input.torneioId
    );
    const deckMapCompleto = new Map(inscricoes.map((i) => [i.usuarioId, i.deckId]));
    const idsComHistorico = Array.from(
      new Set(
        todasPartidas.flatMap((p) => [
          p.jogador1Id,
          ...(p.jogador2Id ? [p.jogador2Id] : []),
        ])
      )
    );

    const inscricoesAtivas = inscricoes.filter((i) => !i.dropped);
    const jogadoresIds = inscricoesAtivas.map((i) => i.usuarioId);
    const deckMap = new Map(inscricoesAtivas.map((i) => [i.usuarioId, i.deckId]));
    const usuarios = await this.usuarioGateway.buscarVarios(jogadoresIds);
    const usuarioNomeMap = new Map(usuarios.map((u) => [u.id, u.nome]));
    const estaNaUltimaRodada = torneio.rodadaAtual >= torneio.totalRodadas;
    const jogadoresIdsSet = new Set(jogadoresIds);

    if (!torneio.emCorte && !estaNaUltimaRodada && jogadoresIds.length < 2) {
      throw ErroPersonalizado.criar({
        mensagem: `Apenas ${jogadoresIds.length} jogador(es) ativo(s) no torneio. São necessários pelo menos 2.`,
        status: StatusErro.erroParametro,
      });
    }

    // Sempre calcular stats com TODOS os jogadores que possuem histórico
    // para que omwp/ogwp use o MWP real de oponentes dropados (não MIN_PERCENTUAL)
    const idsParaStats = Array.from(new Set([...idsComHistorico, ...jogadoresIds]));

    const statsMap = calcularEstatisticas(idsParaStats, todasPartidas);
    const statsOrdenados = ordenarPorDesempate(
      Array.from(statsMap.values()),
      statsMap
    );

    if (estaNaUltimaRodada && torneio.corteTop && !torneio.emCorte) {
      // Apenas jogadores ativos (não-dropados, com check-in) são elegíveis para o corte
      const statsAtivos = statsOrdenados.filter(s => jogadoresIdsSet.has(s.usuarioId));

      if (statsAtivos.length < torneio.corteTop) {
        throw ErroPersonalizado.criar({
          mensagem: `Não há jogadores suficientes para o corte top ${torneio.corteTop}. Jogadores classificados: ${statsAtivos.length}.`,
          status: StatusErro.erroParametro,
        });
      }

      const topNIds = statsAtivos.slice(0, torneio.corteTop).map((s) => s.usuarioId);
      const rodadasCorte = Math.log2(torneio.corteTop); // top8=3, top4=2, top2=1, top16=4
      const proximaRodada = torneio.rodadaAtual + 1;

      const topNUsuarios = await this.usuarioGateway.buscarVarios(topNIds);
      const topNNomeMap = new Map(topNUsuarios.map((u) => [u.id, u.nome]));

      const n = topNIds.length;
      const novasPartidas: Partida[] = [];
      for (let i = 0; i < n / 2; i++) {
        const j1 = topNIds[i];
        const j2 = topNIds[n - 1 - i];
        novasPartidas.push(
          Partida.criar({
            torneioId: input.torneioId,
            rodada: proximaRodada,
            jogador1Id: j1,
            jogador2Id: j2,
            deckJogador1Id: deckMapCompleto.get(j1),
            deckJogador2Id: deckMapCompleto.get(j2),
            mesa: i + 1,
          })
        );
      }

      torneio.entrarEmCorte(proximaRodada, proximaRodada + rodadasCorte - 1);
      await this.torneioGateway.atualizarECriarPartidas(torneio, novasPartidas);

      return {
        finalizado: false,
        rodadaAtual: proximaRodada,
        emCorte: true,
        partidas: novasPartidas.map((p) => ({
          id: p.id,
          jogador1Id: p.jogador1Id,
          jogador1Nome: topNNomeMap.get(p.jogador1Id) ?? p.jogador1Id,
          jogador2Id: p.jogador2Id,
          jogador2Nome: p.jogador2Id ? (topNNomeMap.get(p.jogador2Id) ?? p.jogador2Id) : null,
          deckJogador1Id: p.deckJogador1Id,
          deckJogador2Id: p.deckJogador2Id,
        })),
      };
    }

    if (estaNaUltimaRodada) {
      torneio.finalizar();
      await this.torneioGateway.atualizar(torneio);

      const classificacao = statsOrdenados.map((s, idx) => ({
        posicao: idx + 1,
        usuarioId: s.usuarioId,
        pontosMesa: s.pontosMesa,
        omwp: omwp(s, statsMap),
        gwp: gwp(s),
        ogwp: ogwp(s, statsMap),
      }));

      return { finalizado: true, classificacao };
    }

    if (torneio.emCorte) {
      const vencedoresIds = partidasRodadaAtual.map((p) => {
        if (p.jogador2Id === null) return p.jogador1Id; // bye automático
        if (p.vitoriasJogador1 > p.vitoriasJogador2) return p.jogador1Id;
        if (p.vitoriasJogador2 > p.vitoriasJogador1) return p.jogador2Id;
        const idx1 = statsOrdenados.findIndex(s => s.usuarioId === p.jogador1Id);
        const idx2 = statsOrdenados.findIndex(s => s.usuarioId === p.jogador2Id);
        return idx1 <= idx2 ? p.jogador1Id : p.jogador2Id;
      });

      const vencedoresOrdenados = statsOrdenados
        .filter((s) => vencedoresIds.includes(s.usuarioId))
        .map((s) => s.usuarioId);

      const vencedoresUsuarios = await this.usuarioGateway.buscarVarios(vencedoresOrdenados);
      const vencedoresNomeMap = new Map(vencedoresUsuarios.map((u) => [u.id, u.nome]));

      const proximaRodada = torneio.rodadaAtual + 1;
      const novasPartidas: Partida[] = [];
      for (let i = 0; i < vencedoresOrdenados.length; i += 2) {
        const j1 = vencedoresOrdenados[i];
        const j2 = vencedoresOrdenados[i + 1] ?? null;
        novasPartidas.push(
          Partida.criar({
            torneioId: input.torneioId,
            rodada: proximaRodada,
            jogador1Id: j1,
            jogador2Id: j2,
            deckJogador1Id: deckMapCompleto.get(j1),
            deckJogador2Id: j2 ? deckMapCompleto.get(j2) : null,
            mesa: Math.floor(i / 2) + 1,
          })
        );
      }

      torneio.avancarRodada(proximaRodada);
      await this.torneioGateway.atualizarECriarPartidas(torneio, novasPartidas);

      return {
        finalizado: false,
        rodadaAtual: proximaRodada,
        emCorte: true,
        partidas: novasPartidas.map((p) => ({
          id: p.id,
          jogador1Id: p.jogador1Id,
          jogador1Nome: vencedoresNomeMap.get(p.jogador1Id) ?? p.jogador1Id,
          jogador2Id: p.jogador2Id,
          jogador2Nome: p.jogador2Id ? (vencedoresNomeMap.get(p.jogador2Id) ?? p.jogador2Id) : null,
          deckJogador1Id: p.deckJogador1Id,
          deckJogador2Id: p.deckJogador2Id,
        })),
      };
    }

    const historico = new Set<string>();
    const jaRecebeuBye = new Set<string>();
    for (const p of todasPartidas) {
      if (p.jogador2Id !== null) {
        historico.add(parKey(p.jogador1Id, p.jogador2Id));
      } else if (p.vitoriasJogador1 > p.vitoriasJogador2) {
        // BYE normal (vitória) — rastrear para evitar repetição
        jaRecebeuBye.add(p.jogador1Id);
      }
    }

    const proximaRodada = torneio.rodadaAtual + 1;
    // Filtrar statsOrdenados para apenas jogadores com check-in ativo
    const statsParaPareamento = statsOrdenados.filter(
      (s) => jogadoresIdsSet.has(s.usuarioId)
    );
    const pares = gerarPareamentos(statsParaPareamento, historico, jaRecebeuBye);

    const novasPartidas: Partida[] = pares.map((par, idx) =>
      Partida.criar({
        torneioId: input.torneioId,
        rodada: proximaRodada,
        jogador1Id: par.jogador1Id,
        jogador2Id: par.jogador2Id,
        deckJogador1Id: deckMap.get(par.jogador1Id),
        deckJogador2Id: par.jogador2Id ? deckMap.get(par.jogador2Id) : null,
        mesa: idx + 1,
      })
    );

    torneio.avancarRodada(proximaRodada);
    await this.torneioGateway.atualizarECriarPartidas(torneio, novasPartidas);

    return {
      finalizado: false,
      rodadaAtual: proximaRodada,
      emCorte: false,
      partidas: novasPartidas.map((p) => ({
        id: p.id,
        jogador1Id: p.jogador1Id,
        jogador1Nome: usuarioNomeMap.get(p.jogador1Id) ?? p.jogador1Id,
        jogador2Id: p.jogador2Id,
        jogador2Nome: p.jogador2Id ? (usuarioNomeMap.get(p.jogador2Id) ?? p.jogador2Id) : null,
        deckJogador1Id: p.deckJogador1Id,
        deckJogador2Id: p.deckJogador2Id,
      })),
    };
  }
}
