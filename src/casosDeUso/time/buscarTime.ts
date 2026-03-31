import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type BuscarTimeInputDto = {
  id: string;
};

export type BuscarTimeOutputDto = {
  id: string;
  nome: string;
  tag: string;
  donoId: string;
  membros: { id: string; nome: string }[];
  fotoUrl?: string;
  criadoEm: Date;
};

export class BuscarTime implements CasoDeUso<BuscarTimeInputDto, BuscarTimeOutputDto> {
  private constructor(
    private readonly timeGateway: TimeGateway,
    private readonly usuarioGateway: UsuarioGateway
  ) {}

  public static criar(timeGateway: TimeGateway, usuarioGateway: UsuarioGateway) {
    return new BuscarTime(timeGateway, usuarioGateway);
  }

  public async executar(input: BuscarTimeInputDto): Promise<BuscarTimeOutputDto> {
    const time = await this.timeGateway.buscarPorId(input.id);
    if (!time) {
      throw ErroPersonalizado.criar({
        mensagem: "Time não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    const usuarios = await this.usuarioGateway.buscarVarios(time.membroIds);
    const usuarioMap = new Map(usuarios.map((u) => [u.id, u.nome]));

    const membros = time.membroIds.map((id) => ({
      id,
      nome: usuarioMap.get(id) ?? id,
    }));

    return {
      id: time.id,
      nome: time.nome,
      tag: time.tag,
      donoId: time.donoId,
      membros,
      fotoUrl: time.fotoUrl,
      criadoEm: time.criadoEm,
    };
  }
}
