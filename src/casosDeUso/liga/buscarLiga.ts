import { LigaGateway } from "../../dominio/gateway/ligaGateway";
import { TipoLiga } from "../../dominio/entidade/liga";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type BuscarLigaInputDto = {
  id: string;
};

export type BuscarLigaOutputDto = {
  id: string;
  nome: string;
  descricao?: string;
  bannerUrl?: string;
  donoId: string;
  tipo: TipoLiga;
  torneios: {
    id: string;
    nome: string;
    formato: string;
    horario: Date;
    status: string;
  }[];
  criadoEm: Date;
};

export class BuscarLiga implements CasoDeUso<BuscarLigaInputDto, BuscarLigaOutputDto> {
  private constructor(
    private readonly ligaGateway: LigaGateway,
    private readonly torneioGateway: TorneioGateway
  ) {}

  public static criar(ligaGateway: LigaGateway, torneioGateway: TorneioGateway) {
    return new BuscarLiga(ligaGateway, torneioGateway);
  }

  public async executar(input: BuscarLigaInputDto): Promise<BuscarLigaOutputDto> {
    const liga = await this.ligaGateway.buscarPorId(input.id);

    if (!liga) {
      throw ErroPersonalizado.criar({
        mensagem: "Liga não encontrada.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    const torneios = await Promise.all(
      liga.torneioIds.map((id) => this.torneioGateway.buscarPorId(id))
    );

    return {
      id: liga.id,
      nome: liga.nome,
      descricao: liga.descricao,
      bannerUrl: liga.bannerUrl,
      donoId: liga.donoId,
      tipo: liga.tipo,
      torneios: torneios
        .filter((t) => t !== null)
        .map((t) => ({
          id: t!.id,
          nome: t!.nome,
          formato: t!.formato,
          horario: t!.horario,
          status: t!.status,
        })),
      criadoEm: liga.criadoEm,
    };
  }
}
