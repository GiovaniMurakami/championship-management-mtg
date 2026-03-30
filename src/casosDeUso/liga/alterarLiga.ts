import { LigaGateway } from "../../dominio/gateway/ligaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type AlterarLigaInputDto = {
  id: string;
  requisitanteId: string;
  isAdmin: boolean;
  nome?: string;
  descricao?: string;
  torneioIds?: string[];
};

export type AlterarLigaOutputDto = {
  id: string;
  nome: string;
  descricao?: string;
  donoId: string;
  torneioIds: string[];
  criadoEm: Date;
};

export class AlterarLiga implements CasoDeUso<AlterarLigaInputDto, AlterarLigaOutputDto> {
  private constructor(
    private readonly ligaGateway: LigaGateway,
    private readonly torneioGateway: TorneioGateway
  ) {}

  public static criar(ligaGateway: LigaGateway, torneioGateway: TorneioGateway) {
    return new AlterarLiga(ligaGateway, torneioGateway);
  }

  public async executar(input: AlterarLigaInputDto): Promise<AlterarLigaOutputDto> {
    const liga = await this.ligaGateway.buscarPorId(input.id);

    if (!liga) {
      throw ErroPersonalizado.criar({
        mensagem: "Liga não encontrada.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (liga.donoId !== input.requisitanteId && !input.isAdmin) {
      throw ErroPersonalizado.criar({
        mensagem: "Sem permissão para alterar esta liga.",
        status: StatusErro.erroProibido,
      });
    }

    if (input.torneioIds !== undefined) {
      for (const torneioId of input.torneioIds) {
        const torneio = await this.torneioGateway.buscarPorId(torneioId);
        if (!torneio) {
          throw ErroPersonalizado.criar({
            mensagem: `Torneio não encontrado: ${torneioId}`,
            status: StatusErro.erroNaoEncontrado,
          });
        }
      }
      liga.torneioIds = input.torneioIds;
    }

    if (input.nome !== undefined) liga.nome = input.nome.trim();
    if (input.descricao !== undefined) liga.descricao = input.descricao?.trim();

    await this.ligaGateway.atualizar(liga);

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
