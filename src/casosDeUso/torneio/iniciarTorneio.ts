import { Partida } from "../../dominio/entidade/partida";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type IniciarTorneioInputDto = {
  torneioId: string;
  donoId: string;
};

export type IniciarTorneioOutputDto = {
  torneioId: string;
  rodadaAtual: number;
  totalRodadas: number;
  partidas: Array<{
    id: string;
    jogador1Id: string;
    jogador1Nome: string;
    jogador2Id: string | null;
    jogador2Nome: string | null;
    deckJogador1Id?: string;
    deckJogador2Id?: string | null;
  }>;
};

export class IniciarTorneio
  implements CasoDeUso<IniciarTorneioInputDto, IniciarTorneioOutputDto> {
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
    return new IniciarTorneio(torneioGateway, inscricaoGateway, partidaGateway, usuarioGateway);
  }

  public async executar(
    input: IniciarTorneioInputDto
  ): Promise<IniciarTorneioOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (torneio.donoId !== input.donoId) {
      throw ErroPersonalizado.criar({
        mensagem: "Apenas o dono do torneio pode iniciá-lo.",
        status: StatusErro.erroProibido,
      });
    }

    if (torneio.status !== "inscricoes_abertas") {
      throw ErroPersonalizado.criar({
        mensagem: "O torneio já foi iniciado ou finalizado.",
        status: StatusErro.erroParametro,
      });
    }

    const inscricoes = await this.inscricaoGateway.listarPorTorneio(
      input.torneioId
    );
    const comCheckIn = inscricoes.filter((i) => i.checkIn && !i.dropped);

    if (comCheckIn.length < 2) {
      throw ErroPersonalizado.criar({
        mensagem:
          "São necessários pelo menos 2 jogadores com check-in para iniciar o torneio.",
        status: StatusErro.erroParametro,
      });
    }

    const totalRodadas = Math.ceil(Math.log2(comCheckIn.length));

    torneio.status = "em_andamento";
    torneio.rodadaAtual = 1;
    torneio.totalRodadas = totalRodadas;
    await this.torneioGateway.atualizar(torneio);

    // Rodada 1: embaralhamento aleatório
    const deckMap = new Map(comCheckIn.map((i) => [i.usuarioId, i.deckId]));
    const jogadores = comCheckIn.map((i) => i.usuarioId);
    const usuarios = await this.usuarioGateway.buscarVarios(jogadores);
    const usuarioNomeMap = new Map(usuarios.map((u) => [u.id, u.nome]));
    for (let i = jogadores.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [jogadores[i], jogadores[j]] = [jogadores[j], jogadores[i]];
    }

    const partidas: Partida[] = [];
    for (let i = 0; i < jogadores.length; i += 2) {
      const j2 = i + 1 < jogadores.length ? jogadores[i + 1] : null;
      partidas.push(
        Partida.criar({
          torneioId: input.torneioId,
          rodada: 1,
          jogador1Id: jogadores[i],
          jogador1Nome: usuarioNomeMap.get(jogadores[i]) ?? jogadores[i],
          jogador2Id: j2,
          jogador2Nome: j2 ? (usuarioNomeMap.get(j2) ?? j2) : null,
          deckJogador1Id: deckMap.get(jogadores[i]),
          deckJogador2Id: j2 ? deckMap.get(j2) : null,
        })
      );
    }

    await this.partidaGateway.salvarVarias(partidas);

    return {
      torneioId: torneio.id,
      rodadaAtual: torneio.rodadaAtual,
      totalRodadas: torneio.totalRodadas,
      partidas: partidas.map((p) => ({
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
