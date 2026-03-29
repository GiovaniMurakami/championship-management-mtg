import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type BuscarTorneioInputDto = {
  torneioId: string;
};

export type BuscarTorneioOutputDto = {
  id: string;
  nome: string;
  horario: Date;
  formato: string;
  donoId: string;
  status: string;
  rodadaAtual: number;
  totalRodadas: number;
  premio?: string;
  bannerUrl?: string;
  linkBanner?: string;
  somRodada?: string;
  maxJogadores?: number;
  maxRodadas?: number;
  corteTop?: number;
  linkLive?: string;
  emCorte: boolean;
  totalInscritos: number;
  totalCheckin: number;
  criadoEm: Date;
  partidas: Array<{
    id: string;
    rodada: number;
    jogador1Id: string;
    jogador1Nome: string;
    jogador2Id: string | null;
    jogador2Nome: string | null;
    vitoriasJogador1: number;
    vitoriasJogador2: number;
    status: string;
  }>;
};

export class BuscarTorneio
  implements CasoDeUso<BuscarTorneioInputDto, BuscarTorneioOutputDto> {
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
    return new BuscarTorneio(torneioGateway, inscricaoGateway, partidaGateway, usuarioGateway);
  }

  public async executar(
    input: BuscarTorneioInputDto
  ): Promise<BuscarTorneioOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    const [inscricoes, partidas] = await Promise.all([
      this.inscricaoGateway.listarPorTorneio(input.torneioId),
      this.partidaGateway.listarPorTorneio(input.torneioId),
    ]);

    const totalInscritos = inscricoes.length;
    const totalCheckin = inscricoes.filter((i) => i.checkIn).length;

    const jogadorIds = new Set<string>();
    for (const p of partidas) {
      jogadorIds.add(p.jogador1Id);
      if (p.jogador2Id) jogadorIds.add(p.jogador2Id);
    }
    const usuarios = await this.usuarioGateway.buscarVarios(
      Array.from(jogadorIds)
    );
    const usuarioMap = new Map(usuarios.map((u) => [u.id, u]));

    return {
      id: torneio.id,
      nome: torneio.nome,
      horario: torneio.horario,
      formato: torneio.formato,
      donoId: torneio.donoId,
      status: torneio.status,
      rodadaAtual: torneio.rodadaAtual,
      totalRodadas: torneio.totalRodadas,
      premio: torneio.premio,
      bannerUrl: torneio.bannerUrl,
      linkBanner: torneio.linkBanner,
      somRodada: torneio.somRodada,
      maxJogadores: torneio.maxJogadores,
      maxRodadas: torneio.maxRodadas,
      corteTop: torneio.corteTop,
      linkLive: torneio.linkLive,
      emCorte: torneio.emCorte,
      totalInscritos,
      totalCheckin,
      criadoEm: torneio.criadoEm,
      partidas: partidas.map((p) => ({
        id: p.id,
        rodada: p.rodada,
        jogador1Id: p.jogador1Id,
        jogador1Nome: p.jogador1Nome ?? usuarioMap.get(p.jogador1Id)?.nome ?? p.jogador1Id,
        jogador2Id: p.jogador2Id,
        jogador2Nome: p.jogador2Id
          ? (p.jogador2Nome ?? usuarioMap.get(p.jogador2Id)?.nome ?? p.jogador2Id)
          : null,
        vitoriasJogador1: p.vitoriasJogador1,
        vitoriasJogador2: p.vitoriasJogador2,
        status: p.status,
      })),
    };
  }
}
