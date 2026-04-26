import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { StatusTorneio } from "../../dominio/entidade/torneio";
import { CasoDeUso } from "../casoDeUso";

export type ListarTorneiosInputDto = {
  usuarioId: string;
  limite?: number;
  offset?: number;
  status?: StatusTorneio;
  nome?: string;
};

export type ListarTorneiosOutputDto = {
  torneios: Array<{
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
    secreto: boolean;
    criadoEm: Date;
    inscrito: boolean;
    totalInscritos: number;
  }>;
  total: number;
  limite: number;
  offset: number;
};

export class ListarTorneios
  implements CasoDeUso<ListarTorneiosInputDto, ListarTorneiosOutputDto> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly inscricaoGateway: InscricaoGateway
  ) { }

  public static criar(torneioGateway: TorneioGateway, inscricaoGateway: InscricaoGateway) {
    return new ListarTorneios(torneioGateway, inscricaoGateway);
  }

  public async executar({ usuarioId, limite = 20, offset = 0, status, nome }: ListarTorneiosInputDto): Promise<ListarTorneiosOutputDto> {
    const [torneios, total, inscricoes] = await Promise.all([
      this.torneioGateway.listar({ limite, offset, incluirSecretos: false, status, nome }),
      this.torneioGateway.listarTotal({ incluirSecretos: false, status, nome }),
      this.inscricaoGateway.listarPorUsuario(usuarioId),
    ]);

    const torneiosInscritos = new Set(inscricoes.map((i) => i.torneioId));
    const torneioIds = torneios.map((t) => t.id);
    const contagemInscritos = torneioIds.length > 0
      ? await this.inscricaoGateway.contarPorTorneios(torneioIds)
      : {};

    return {
      torneios: torneios.map((t) => ({
        id: t.id,
        nome: t.nome,
        horario: t.horario,
        formato: t.formato,
        donoId: t.donoId,
        status: t.status,
        rodadaAtual: t.rodadaAtual,
        totalRodadas: t.totalRodadas,
        premio: t.premio,
        bannerUrl: t.bannerUrl,
        linkBanner: t.linkBanner,
        somRodada: t.somRodada,
        maxJogadores: t.maxJogadores,
        maxRodadas: t.maxRodadas,
        corteTop: t.corteTop,
        linkLive: t.linkLive,
        emCorte: t.emCorte,
        secreto: t.secreto,
        criadoEm: t.criadoEm,
        inscrito: torneiosInscritos.has(t.id),
        totalInscritos: contagemInscritos[t.id] ?? 0,
      })),
      total,
      limite,
      offset,
    };
  }
}
