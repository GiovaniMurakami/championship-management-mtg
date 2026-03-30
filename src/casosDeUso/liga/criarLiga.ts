import { Liga } from "../../dominio/entidade/liga";
import { LigaGateway } from "../../dominio/gateway/ligaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type CriarLigaInputDto = {
  nome: string;
  donoId: string;
  descricao?: string;
  torneioIds?: string[];
};

export type CriarLigaOutputDto = {
  id: string;
  nome: string;
  descricao?: string;
  donoId: string;
  torneioIds: string[];
  criadoEm: Date;
};

export class CriarLiga implements CasoDeUso<CriarLigaInputDto, CriarLigaOutputDto> {
  private constructor(
    private readonly ligaGateway: LigaGateway,
    private readonly torneioGateway: TorneioGateway
  ) {}

  public static criar(ligaGateway: LigaGateway, torneioGateway: TorneioGateway) {
    return new CriarLiga(ligaGateway, torneioGateway);
  }

  public async executar(input: CriarLigaInputDto): Promise<CriarLigaOutputDto> {
    const torneioIds = input.torneioIds ?? [];

    for (const torneioId of torneioIds) {
      const torneio = await this.torneioGateway.buscarPorId(torneioId);
      if (!torneio) {
        throw ErroPersonalizado.criar({
          mensagem: `Torneio não encontrado: ${torneioId}`,
          status: StatusErro.erroNaoEncontrado,
        });
      }
    }

    const liga = Liga.criar({
      nome: input.nome.trim(),
      descricao: input.descricao?.trim(),
      donoId: input.donoId,
      torneioIds,
    });

    await this.ligaGateway.salvar(liga);

    return {
      id: liga.id,
      nome: liga.nome,
      descricao: liga.descricao,
      donoId: liga.donoId,
      torneioIds: liga.torneioIds,
      criadoEm: liga.criadoEm,
    };
  }
}
