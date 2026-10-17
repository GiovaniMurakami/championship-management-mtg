import { HallTop8 } from "../../dominio/entidade/hallTop8";
import { HallTop8Gateway } from "../../dominio/gateway/hallTop8Gateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { toBrasiliaISO } from "../../helpers/data/brasilia";

export type CadastrarHallTop8Input = {
  torneioId: string;
  imagemUrl: string;
  torneioNome?: string;
};

export class CadastrarHallTop8 implements CasoDeUso<CadastrarHallTop8Input, unknown> {
  private constructor(
    private readonly hallGateway: HallTop8Gateway,
    private readonly torneioGateway: TorneioGateway,
  ) {}

  public static criar(hallGateway: HallTop8Gateway, torneioGateway: TorneioGateway) {
    return new CadastrarHallTop8(hallGateway, torneioGateway);
  }

  public async executar(input: CadastrarHallTop8Input) {
    const torneioId = String(input.torneioId || "").trim();
    const imagemUrl = String(input.imagemUrl || "").trim();
    if (!torneioId) {
      throw ErroPersonalizado.criar({
        mensagem: "torneioId é obrigatório.",
        status: StatusErro.erroParametro,
      });
    }
    if (!imagemUrl || !/^https?:\/\//i.test(imagemUrl)) {
      throw ErroPersonalizado.criar({
        mensagem: "URL da imagem do Top 8 é obrigatória.",
        status: StatusErro.erroParametro,
      });
    }

    const torneio = await this.torneioGateway.buscarPorId(torneioId);
    const torneioNome = (input.torneioNome || torneio?.nome || "").trim();
    const dataTorneio = torneio?.horario ? new Date(torneio.horario) : undefined;

    const item = HallTop8.criar({
      torneioId,
      torneioNome,
      imagemUrl,
      ativo: true,
      dataTorneio,
    });

    await this.hallGateway.salvar({
      id: item.id,
      torneioId: item.torneioId,
      torneioNome: item.torneioNome,
      imagemUrl: item.imagemUrl,
      ativo: item.ativo,
      dataTorneio: item.dataTorneio,
      criadoEm: item.criadoEm,
    });

    return {
      id: item.id,
      torneioId: item.torneioId,
      torneioNome: item.torneioNome,
      imagemUrl: item.imagemUrl,
      ativo: item.ativo,
      dataTorneio: toBrasiliaISO(item.dataTorneio),
      criadoEm: toBrasiliaISO(item.criadoEm),
    };
  }
}
