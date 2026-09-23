import bcrypt from "bcryptjs";
import { Usuario } from "../../dominio/entidade/usuario";
import { EmailUsuarioJaExisteErro, UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { EmailGateway } from "../../dominio/gateway/emailGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { criarEmailBoasVindas } from "../../infra/services/templatesEmail";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CadastrarUsuarioInputDto = {
  nome: string;
  email: string;
  senha: string;
};

export type CadastrarUsuarioOutputDto = {
  id: string;
  nome: string;
  email: string;
  criadoEm: Date;
};

export class CadastrarUsuario
  implements CasoDeUso<CadastrarUsuarioInputDto, CadastrarUsuarioOutputDto> {
  private constructor(
    private readonly usuarioGateway: UsuarioGateway,
    private readonly emailGateway: EmailGateway
  ) { }

  public static criar(usuarioGateway: UsuarioGateway, emailGateway: EmailGateway) {
    return new CadastrarUsuario(usuarioGateway, emailGateway);
  }

  public async executar(
    input: CadastrarUsuarioInputDto
  ): Promise<CadastrarUsuarioOutputDto> {
    if (!EMAIL_REGEX.test(input.email)) {
      throw ErroPersonalizado.criar({
        mensagem: "Formato de e-mail inválido.",
        status: StatusErro.erroParametro,
      });
    }

    const usuarioExistente = await this.usuarioGateway.buscarPorEmail(
      input.email
    );

    if (usuarioExistente) {
      throw ErroPersonalizado.criar({
        mensagem: "Não foi possível concluir o cadastro.",
        status: StatusErro.erroParametro,
      });
    }

    const senhaHash = await bcrypt.hash(input.senha, 12);

    const usuario = Usuario.criar({
      nome: input.nome,
      email: input.email,
      senha: senhaHash,
    });

    try {
      await this.usuarioGateway.salvar(usuario);
    } catch (error) {
      if (error instanceof EmailUsuarioJaExisteErro) {
        throw ErroPersonalizado.criar({
          mensagem: "Não foi possível concluir o cadastro.",
          status: StatusErro.erroParametro,
        });
      }
      throw error;
    }

    const emailBoasVindas = criarEmailBoasVindas(usuario.nome);
    await this.emailGateway.enviar({
      para: usuario.email,
      assunto: "Bem-vindo ao Fuguete!",
      ...emailBoasVindas,
    });

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      criadoEm: usuario.criadoEm,
    };
  }
}
