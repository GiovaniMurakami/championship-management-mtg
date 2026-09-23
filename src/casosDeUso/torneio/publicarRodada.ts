import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { toBrasiliaISO } from "../../helpers/data/brasilia";
import { podeGerenciarTorneio } from "../../helpers/torneio/podeGerenciarTorneio";
import { rodadaEstaPublicada } from "../../helpers/torneio/filtrarPartidasNaoPublicadas";
import { resolverNomeJogador } from "../../helpers/torneio/resolverNomeJogador";
import { eventosTorneio } from "../../infra/socketio/eventosTorneio";

export type PublicarRodadaInputDto = {
  torneioId: string;
  donoId: string;
  isAdmin: boolean;
};

export type PublicarRodadaOutputDto = {
  torneioId: string;
  rodadaAtual: number;
  totalRodadas: number;
  emCorte: boolean;
  rodadaPublicada: true;
  rodadaIniciadaEm: string;
  partidas: Array<{
    id: string;
    jogador1Id: string;
    jogador1Nome: string;
    jogador2Id: string | null;
    jogador2Nome: string | null;
  }>;
};

export class PublicarRodada implements CasoDeUso<PublicarRodadaInputDto, PublicarRodadaOutputDto> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly partidaGateway: PartidaGateway,
    private readonly usuarioGateway: UsuarioGateway,
  ) {}

  public static criar(
    torneioGateway: TorneioGateway,
    partidaGateway: PartidaGateway,
    usuarioGateway: UsuarioGateway,
  ) {
    return new PublicarRodada(torneioGateway, partidaGateway, usuarioGateway);
  }

  public async executar(input: PublicarRodadaInputDto): Promise<PublicarRodadaOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (!podeGerenciarTorneio(torneio, input.donoId, input.isAdmin)) {
      throw ErroPersonalizado.criar({
        mensagem: "Apenas o dono, anfitrião ou administrador do torneio pode publicar a rodada.",
        status: StatusErro.erroProibido,
      });
    }

    if (torneio.status !== "em_andamento") {
      throw ErroPersonalizado.criar({
        mensagem: "Só é possível publicar a rodada de um torneio em andamento.",
        status: StatusErro.erroParametro,
      });
    }

    if (rodadaEstaPublicada(torneio)) {
      throw ErroPersonalizado.criar({
        mensagem: "A rodada atual já está publicada.",
        status: StatusErro.erroParametro,
      });
    }

    const partidas = await this.partidaGateway.listarPorTorneioERodada(input.torneioId, torneio.rodadaAtual);
    if (partidas.length === 0) {
      throw ErroPersonalizado.criar({
        mensagem: "Não há pareamentos gerados para publicar.",
        status: StatusErro.erroParametro,
      });
    }

    torneio.rodadaPublicada = true;
    torneio.rodadaIniciadaEm = new Date();
    await this.torneioGateway.atualizar(torneio);

    const ids = Array.from(new Set(partidas.flatMap((p) => [p.jogador1Id, ...(p.jogador2Id ? [p.jogador2Id] : [])])));
    const usuarios = await this.usuarioGateway.buscarVarios(ids);
    const nomes = new Map(usuarios.map((u) => [u.id, resolverNomeJogador(u, torneio.exibirNomeJogador)]));

    const partidasDto = partidas.map((p) => ({
      id: p.id,
      jogador1Id: p.jogador1Id,
      jogador1Nome: nomes.get(p.jogador1Id) ?? p.jogador1Id,
      jogador2Id: p.jogador2Id,
      jogador2Nome: p.jogador2Id ? (nomes.get(p.jogador2Id) ?? p.jogador2Id) : null,
    }));

    eventosTorneio.emit("rodada_iniciada", {
      torneioId: torneio.id,
      rodadaAtual: torneio.rodadaAtual,
      totalRodadas: torneio.totalRodadas,
      emCorte: torneio.emCorte,
      rodadaIniciadaEm: toBrasiliaISO(torneio.rodadaIniciadaEm),
      partidas: partidasDto,
    });

    if (torneio.emCorte) {
      eventosTorneio.emit("corte_iniciado", {
        torneioId: torneio.id,
        corteTop: partidasDto.length * 2,
        rodadaAtual: torneio.rodadaAtual,
      });
    }

    return {
      torneioId: torneio.id,
      rodadaAtual: torneio.rodadaAtual,
      totalRodadas: torneio.totalRodadas,
      emCorte: torneio.emCorte,
      rodadaPublicada: true,
      rodadaIniciadaEm: toBrasiliaISO(torneio.rodadaIniciadaEm)!,
      partidas: partidasDto,
    };
  }
}
