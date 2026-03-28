import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { CasoDeUso } from "../casoDeUso";

export type ListarTorneiosInputDto = { usuarioId: string };

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
    criadoEm: Date;
    inscrito: boolean;
  }>;
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

  public async executar({ usuarioId }: ListarTorneiosInputDto): Promise<ListarTorneiosOutputDto> {
    const [torneios, inscricoes] = await Promise.all([
      this.torneioGateway.listar(),
      this.inscricaoGateway.listarPorUsuario(usuarioId),
    ]);

    const torneiosInscritos = new Set(inscricoes.map((i) => i.torneioId));

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
        criadoEm: t.criadoEm,
        inscrito: torneiosInscritos.has(t.id),
      })),
    };
  }
}
