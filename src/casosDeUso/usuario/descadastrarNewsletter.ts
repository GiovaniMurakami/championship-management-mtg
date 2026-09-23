import { EmailUsuarioJaExisteErro, UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { validarTokenDescadastroNewsletter } from "../../helpers/newsletterToken";

export type DescadastrarNewsletterInputDto = {
  token: string;
};

export class DescadastrarNewsletter
  implements CasoDeUso<DescadastrarNewsletterInputDto, { ok: true; emailMascarado?: string; usuarioId: string }>
{
  private constructor(private readonly usuarioGateway: UsuarioGateway) {}

  public static criar(usuarioGateway: UsuarioGateway) {
    return new DescadastrarNewsletter(usuarioGateway);
  }

  public async executar(input: DescadastrarNewsletterInputDto) {
    const usuarioId = validarTokenDescadastroNewsletter(input.token);
    if (!usuarioId) {
      throw ErroPersonalizado.criar({
        mensagem: "Link de descadastro inválido.",
        status: StatusErro.erroParametro,
      });
    }

    let usuario = await this.usuarioGateway.buscarPorId(usuarioId);
    if (!usuario || usuario.excluido) {
      throw ErroPersonalizado.criar({
        mensagem: "Usuário não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (usuario.newsletterMetagame !== false) {
      usuario.newsletterMetagame = false;
      try {
        await this.usuarioGateway.atualizar(usuario);
      } catch (err) {
        // Race de requests paralelos (ex.: Strict Mode) cancela a TransactWrite
        // e o repositório mapeia como EmailUsuarioJaExisteErro.
        if (!(err instanceof EmailUsuarioJaExisteErro)) throw err;
        const atualizado = await this.usuarioGateway.buscarPorId(usuarioId);
        if (!atualizado || atualizado.excluido) {
          throw ErroPersonalizado.criar({
            mensagem: "Usuário não encontrado.",
            status: StatusErro.erroNaoEncontrado,
          });
        }
        if (atualizado.newsletterMetagame !== false) {
          atualizado.newsletterMetagame = false;
          await this.usuarioGateway.atualizar(atualizado);
        }
        usuario = atualizado;
      }
    }

    const email = usuario.email || "";
    const emailMascarado = email.includes("@")
      ? `${email.slice(0, 2)}***@${email.split("@")[1]}`
      : undefined;

    return { ok: true as const, emailMascarado, usuarioId };
  }
}
