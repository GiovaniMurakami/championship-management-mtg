import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type BuscarMeuUsuarioInputDto = {
  id: string;
};

export type BuscarMeuUsuarioOutputDto = {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  nickMTGO?: string;
  nickArena?: string;
  fotoUrl?: string;
  descricaoAssinatura?: string;
  role: "user" | "admin" | "editor";
  newsletterMetagame: boolean | null;
  criadoEm: Date;
};

export class BuscarMeuUsuario
  implements CasoDeUso<BuscarMeuUsuarioInputDto, BuscarMeuUsuarioOutputDto>
{
  private constructor(private readonly usuarioGateway: UsuarioGateway) {}

  public static criar(usuarioGateway: UsuarioGateway) {
    return new BuscarMeuUsuario(usuarioGateway);
  }

  public async executar(input: BuscarMeuUsuarioInputDto): Promise<BuscarMeuUsuarioOutputDto> {
    const usuario = await this.usuarioGateway.buscarPorId(input.id);
    if (!usuario || usuario.excluido) {
      throw ErroPersonalizado.criar({
        mensagem: "Usuário não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      telefone: usuario.telefone,
      nickMTGO: usuario.nickMTGO,
      nickArena: usuario.nickArena,
      fotoUrl: usuario.fotoUrl,
      descricaoAssinatura: usuario.descricaoAssinatura,
      role: usuario.role,
      newsletterMetagame: usuario.newsletterMetagame,
      criadoEm: usuario.criadoEm,
    };
  }
}
