import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type AlterarTorneioInputDto = {
  id: string;
  requisitanteId: string;
  isAdmin: boolean;
  nome?: string;
  horario?: Date;
  formato?: string;
  premio?: string;
  bannerUrl?: string;
  linkBanner?: string;
  somRodada?: string;
  maxJogadores?: number;
  maxRodadas?: number;
  corteTop?: number;
  linkLive?: string;
  secreto?: boolean;
};

export type AlterarTorneioOutputDto = {
  id: string;
  nome: string;
  horario: Date;
  formato: string;
  donoId: string;
  status: string;
  premio?: string;
  bannerUrl?: string;
  linkBanner?: string;
  somRodada?: string;
  maxJogadores?: number;
  maxRodadas?: number;
  corteTop?: number;
  linkLive?: string;
  secreto: boolean;
  criadoEm: Date;
};

export class AlterarTorneio
  implements CasoDeUso<AlterarTorneioInputDto, AlterarTorneioOutputDto> {
  private constructor(private readonly torneioGateway: TorneioGateway) { }

  public static criar(torneioGateway: TorneioGateway) {
    return new AlterarTorneio(torneioGateway);
  }

  public async executar(input: AlterarTorneioInputDto): Promise<AlterarTorneioOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.id);

    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (torneio.donoId !== input.requisitanteId && !input.isAdmin) {
      throw ErroPersonalizado.criar({
        mensagem: "Sem permissão para alterar este torneio.",
        status: StatusErro.erroProibido,
      });
    }

    if (torneio.status !== "inscricoes_abertas") {
      throw ErroPersonalizado.criar({
        mensagem: "Só é possível alterar torneios com inscrições abertas.",
        status: StatusErro.erroParametro,
      });
    }

    if (input.nome !== undefined) torneio.nome = input.nome.trim();
    if (input.horario !== undefined) torneio.horario = input.horario;
    if (input.formato !== undefined) torneio.formato = input.formato.toLowerCase().trim();
    if (input.premio !== undefined) torneio.premio = input.premio?.trim();
    if (input.bannerUrl !== undefined) torneio.bannerUrl = input.bannerUrl?.trim();
    if (input.linkBanner !== undefined) torneio.linkBanner = input.linkBanner?.trim();
    if (input.somRodada !== undefined) torneio.somRodada = input.somRodada?.trim();
    if (input.maxJogadores !== undefined) torneio.maxJogadores = input.maxJogadores;
    if (input.maxRodadas !== undefined) torneio.maxRodadas = input.maxRodadas;
    if (input.corteTop !== undefined) torneio.corteTop = input.corteTop;
    if (input.linkLive !== undefined) torneio.linkLive = input.linkLive?.trim();
    if (input.secreto !== undefined) torneio.secreto = input.secreto;

    await this.torneioGateway.atualizar(torneio);

    return {
      id: torneio.id,
      nome: torneio.nome,
      horario: torneio.horario,
      formato: torneio.formato,
      donoId: torneio.donoId,
      status: torneio.status,
      premio: torneio.premio,
      bannerUrl: torneio.bannerUrl,
      linkBanner: torneio.linkBanner,
      somRodada: torneio.somRodada,
      maxJogadores: torneio.maxJogadores,
      maxRodadas: torneio.maxRodadas,
      corteTop: torneio.corteTop,
      linkLive: torneio.linkLive,
      secreto: torneio.secreto,
      criadoEm: torneio.criadoEm,
    };
  }
}
