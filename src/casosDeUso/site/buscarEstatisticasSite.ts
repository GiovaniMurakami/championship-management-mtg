import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";

const FORMATOS_SUPORTADOS = 6;

export type BuscarEstatisticasSiteOutput = {
  torneiosRealizados: number;
  jogadoresAtivos: number;
  formatosSuportados: number;
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
    const [torneiosRealizados, jogadoresAtivos] = await Promise.all([
      this.torneioGateway.listarTotal({ status: "finalizado" }),
      this.inscricaoGateway.contarJogadoresDistintos(),
    ]);

    return {
      torneiosRealizados,
      jogadoresAtivos,
      formatosSuportados: FORMATOS_SUPORTADOS,
    };
  }
}
