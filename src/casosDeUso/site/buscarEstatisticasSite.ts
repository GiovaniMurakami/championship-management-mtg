import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";

export type BuscarEstatisticasSiteOutput = {
  torneiosRealizados: number;
  jogadoresAtivos: number;
  premiacaoTix: number;
  premiacaoPlayerPoints: number;
};

export class BuscarEstatisticasSite {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly inscricaoGateway: InscricaoGateway
  ) {}

  public static criar(torneioGateway: TorneioGateway, inscricaoGateway: InscricaoGateway) {
    return new BuscarEstatisticasSite(torneioGateway, inscricaoGateway);
  }

  public async executar(): Promise<BuscarEstatisticasSiteOutput> {
    const [torneiosFinalizados, jogadoresAtivos] = await Promise.all([
      this.torneioGateway.listar({ status: "finalizado", incluirSecretos: true }),
      this.inscricaoGateway.contarJogadoresDistintos(),
    ]);

    let premiacaoTix = 0;
    let premiacaoPlayerPoints = 0;
    for (const torneio of torneiosFinalizados) {
      premiacaoTix += Number(torneio.premio?.tix) || 0;
      premiacaoPlayerPoints += Number(torneio.premio?.playerPoints) || 0;
    }

    return {
      torneiosRealizados: torneiosFinalizados.length,
      jogadoresAtivos,
      premiacaoTix: Number(premiacaoTix.toFixed(2)),
      premiacaoPlayerPoints: Math.round(premiacaoPlayerPoints),
    };
  }
}
