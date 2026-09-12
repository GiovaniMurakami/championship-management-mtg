import { Liga } from "../../dominio/entidade/liga";
import { ExibirNomeJogador, StoryFundoTextoRodape, Torneio } from "../../dominio/entidade/torneio";
import { LigaGateway } from "../../dominio/gateway/ligaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { toBrasiliaISO } from "../../helpers/data/brasilia";
import { eventosTorneio } from "../../infra/socketio/eventosTorneio";

const CORTES_VALIDOS = [2, 4, 8, 16];

export type CriarTorneioInputDto = {
  nome: string;
  horario: Date;
  formato: string;
  donoId: string;
  descricao?: string;
  regras?: string;
  bannerUrl?: string;
  linkBanner?: string;
  somRodada?: string;
  storyFundoUrl?: string;
  storyFundoTextoRodape?: StoryFundoTextoRodape;
  maxJogadores?: number;
  maxRodadas?: number;
  corteTop?: number;
  premio?: { playerPoints: number; tix: number };
  linkLive?: string;
  secreto?: boolean;
  exibirNomeJogador?: ExibirNomeJogador;
  ligaIds?: string[];
};

export type CriarTorneioOutputDto = {
  id: string;
  nome: string;
  horario: string;
  formato: string;
  donoId: string;
  status: string;
  descricao?: string;
  regras?: string;
  bannerUrl?: string;
  linkBanner?: string;
  somRodada?: string;
  storyFundoUrl?: string;
  storyFundoTextoRodape: StoryFundoTextoRodape;
  maxJogadores?: number;
  maxRodadas?: number;
  corteTop?: number;
  premio?: { playerPoints: number; tix: number };
  linkLive?: string;
  secreto: boolean;
  exibirNomeJogador: ExibirNomeJogador;
  ligaIds: string[];
  criadoEm: string;
};

export class CriarTorneio
  implements CasoDeUso<CriarTorneioInputDto, CriarTorneioOutputDto> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly ligaGateway?: LigaGateway,
  ) { }

  public static criar(torneioGateway: TorneioGateway, ligaGateway?: LigaGateway) {
    return new CriarTorneio(torneioGateway, ligaGateway);
  }

  public async executar(
    input: CriarTorneioInputDto
  ): Promise<CriarTorneioOutputDto> {
    if (input.corteTop !== undefined && !CORTES_VALIDOS.includes(input.corteTop)) {
      throw ErroPersonalizado.criar({
        mensagem: `O corte deve ser 2, 4, 8 ou 16. Valor recebido: ${input.corteTop}.`,
        status: StatusErro.erroParametro,
      });
    }

    const torneio = Torneio.criar({
      nome: input.nome.trim(),
      horario: input.horario,
      formato: input.formato.toLowerCase().trim(),
      donoId: input.donoId,
      descricao: input.descricao?.trim(),
      regras: input.regras?.trim(),
      bannerUrl: input.bannerUrl?.trim(),
      linkBanner: input.linkBanner?.trim(),
      somRodada: input.somRodada?.trim(),
      storyFundoUrl: input.storyFundoUrl?.trim(),
      storyFundoTextoRodape: input.storyFundoTextoRodape,
      maxJogadores: input.maxJogadores,
      maxRodadas: input.maxRodadas,
      corteTop: input.corteTop,
      premio: input.premio,
      linkLive: input.linkLive?.trim(),
      secreto: input.secreto ?? false,
      exibirNomeJogador: input.exibirNomeJogador ?? "nome",
    });

    const ligaIds = [...new Set((input.ligaIds ?? []).filter(Boolean))];
    const ligas: Liga[] = [];
    if (ligaIds.length > 0) {
      if (!this.ligaGateway) {
        throw ErroPersonalizado.criar({
          mensagem: "Não foi possível associar o torneio às ligas.",
          status: StatusErro.erroParametro,
        });
      }
      for (const ligaId of ligaIds) {
        const liga = await this.ligaGateway.buscarPorId(ligaId);
        if (!liga) {
          throw ErroPersonalizado.criar({
            mensagem: `Liga não encontrada: ${ligaId}`,
            status: StatusErro.erroNaoEncontrado,
          });
        }
        ligas.push(liga);
      }
    }

    await this.torneioGateway.salvar(torneio);
    for (const liga of ligas) {
      if (!liga.torneioIds.includes(torneio.id)) {
        liga.torneioIds = [...liga.torneioIds, torneio.id];
        await this.ligaGateway!.atualizar(liga);
      }
    }

    eventosTorneio.emit("torneio_criado", {
      torneioId: torneio.id,
    });

    return {
      id: torneio.id,
      nome: torneio.nome,
      horario: toBrasiliaISO(torneio.horario)!,
      formato: torneio.formato,
      donoId: torneio.donoId,
      status: torneio.status,
      descricao: torneio.descricao,
      regras: torneio.regras,
      bannerUrl: torneio.bannerUrl,
      linkBanner: torneio.linkBanner,
      somRodada: torneio.somRodada,
      storyFundoUrl: torneio.storyFundoUrl,
      storyFundoTextoRodape: torneio.storyFundoTextoRodape,
      maxJogadores: torneio.maxJogadores,
      maxRodadas: torneio.maxRodadas,
      corteTop: torneio.corteTop,
      premio: torneio.premio,
      linkLive: torneio.linkLive,
      secreto: torneio.secreto,
      exibirNomeJogador: torneio.exibirNomeJogador,
      ligaIds,
      criadoEm: toBrasiliaISO(torneio.criadoEm)!,
    };
  }
}
