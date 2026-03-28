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
};

export type IniciarProximaRodadaOutputDto =
  | {
    finalizado: false;
    rodadaAtual: number;
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

    if (torneio.donoId !== input.donoId) {
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
    const inscricoesComCheckIn = inscricoes.filter(
      (i) => i.checkIn && i.checkInRodada >= torneio.rodadaAtual && !i.dropped
    );
    const jogadoresIds = inscricoesComCheckIn.map((i) => i.usuarioId);
    const deckMap = new Map(inscricoesComCheckIn.map((i) => [i.usuarioId, i.deckId]));
    const usuarios = await this.usuarioGateway.buscarVarios(jogadoresIds);
    const usuarioNomeMap = new Map(usuarios.map((u) => [u.id, u.nome]));

    if (jogadoresIds.length < 2) {
      throw ErroPersonalizado.criar({
        mensagem: `Apenas ${jogadoresIds.length} jogador(es) fez check-in para a próxima rodada. São necessários pelo menos 2.`,
        status: StatusErro.erroParametro,
      });
    }

    const statsMap = calcularEstatisticas(jogadoresIds, todasPartidas);
    const statsOrdenados = ordenarPorDesempate(
      Array.from(statsMap.values()),
      statsMap
    );

    if (torneio.rodadaAtual >= torneio.totalRodadas) {
      torneio.status = "finalizado";
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

    const historico = new Set<string>();
    for (const p of todasPartidas) {
      if (p.jogador2Id !== null) {
        historico.add(parKey(p.jogador1Id, p.jogador2Id));
      }
    }

    const proximaRodada = torneio.rodadaAtual + 1;
    const pares = gerarPareamentos(statsOrdenados, historico);

    const novasPartidas: Partida[] = pares.map((par) =>
      Partida.criar({
        torneioId: input.torneioId,
        rodada: proximaRodada,
        jogador1Id: par.jogador1Id,
        jogador1Nome: usuarioNomeMap.get(par.jogador1Id) ?? par.jogador1Id,
        jogador2Id: par.jogador2Id,
        jogador2Nome: par.jogador2Id
          ? (usuarioNomeMap.get(par.jogador2Id) ?? par.jogador2Id)
          : null,
        deckJogador1Id: deckMap.get(par.jogador1Id),
        deckJogador2Id: par.jogador2Id ? deckMap.get(par.jogador2Id) : null,
      })
    );

    await this.partidaGateway.salvarVarias(novasPartidas);

    torneio.rodadaAtual = proximaRodada;
    await this.torneioGateway.atualizar(torneio);

    return {
      finalizado: false,
      rodadaAtual: proximaRodada,
      partidas: novasPartidas.map((p) => ({
        id: p.id,
        jogador1Id: p.jogador1Id,
        jogador1Nome: p.jogador1Nome ?? p.jogador1Id,
        jogador2Id: p.jogador2Id,
        jogador2Nome: p.jogador2Id ? (p.jogador2Nome ?? p.jogador2Id) : null,
        deckJogador1Id: p.deckJogador1Id,
        deckJogador2Id: p.deckJogador2Id,
      })),
    };
  }
}
