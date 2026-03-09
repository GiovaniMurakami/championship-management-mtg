import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type AtualizarUsuarioInputDto = {
  id: string;
  nome?: string;
  telefone?: string;
  nickMTGO?: string;
  nickArena?: string;
};

export type AtualizarUsuarioOutputDto = {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  nickMTGO?: string;
  nickArena?: string;
  criadoEm: Date;
};

export class AtualizarUsuario
  implements CasoDeUso<AtualizarUsuarioInputDto, AtualizarUsuarioOutputDto>
{
  private constructor(private readonly usuarioGateway: UsuarioGateway) {}

  public static criar(usuarioGateway: UsuarioGateway) {
    return new AtualizarUsuario(usuarioGateway);
  }

  public async executar(
    input: AtualizarUsuarioInputDto
  ): Promise<AtualizarUsuarioOutputDto> {
    const usuario = await this.usuarioGateway.buscarPorId(input.id);

    if (!usuario) {
      throw ErroPersonalizado.criar({
        mensagem: "Usuário não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (input.nome !== undefined) {
      const nomeFormatado = input.nome.trim();
      if (nomeFormatado.length < 3) {
        throw ErroPersonalizado.criar({
          mensagem: "Nome deve ter no mínimo 3 caracteres.",
          status: StatusErro.erroParametro,
        });
      }
      usuario.nome = nomeFormatado;
    }

    if (input.telefone !== undefined) {
      usuario.telefone = input.telefone.trim() || undefined;
    }

    if (input.nickMTGO !== undefined) {
      usuario.nickMTGO = input.nickMTGO.trim() || undefined;
    }

    if (input.nickArena !== undefined) {
      usuario.nickArena = input.nickArena.trim() || undefined;
    }

    await this.usuarioGateway.atualizar(usuario);

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      telefone: usuario.telefone,
      nickMTGO: usuario.nickMTGO,
      nickArena: usuario.nickArena,
      criadoEm: usuario.criadoEm,
    };
  }
}
