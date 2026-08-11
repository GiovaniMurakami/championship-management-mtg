import crypto from "crypto";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { LoginAttemptGateway } from "../../dominio/gateway/loginAttemptGateway";
import { RefreshTokenGateway } from "../../dominio/gateway/refreshTokenGateway";
import { EmailGateway } from "../../dominio/gateway/emailGateway";
import { ResetSenhaGateway } from "../../dominio/gateway/resetSenhaGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { signToken } from "../../helpers/jwt";
import { buildFrontendAppLink } from "../../helpers/env";

const MAX_TENTATIVAS = 5;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const RESET_EXPIRACAO_MS = 60 * 60 * 1000; // 1 hora

export type LoginUsuarioInputDto = {
  email: string;
  senha: string;
};

export type LoginUsuarioOutputDto = {
  token: string;
  refreshToken: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    role: string;
    telefone?: string;
    nickMTGO?: string;
    nickArena?: string;
  };
};

export class LoginUsuario
  implements CasoDeUso<LoginUsuarioInputDto, LoginUsuarioOutputDto> {
  private constructor(
    private readonly usuarioGateway: UsuarioGateway,
    private readonly loginAttemptGateway: LoginAttemptGateway,
    private readonly refreshTokenGateway: RefreshTokenGateway,
    private readonly emailGateway: EmailGateway,
    private readonly resetSenhaGateway: ResetSenhaGateway
  ) { }

  public static criar(
    usuarioGateway: UsuarioGateway,
    loginAttemptGateway: LoginAttemptGateway,
    refreshTokenGateway: RefreshTokenGateway,
    emailGateway: EmailGateway,
    resetSenhaGateway: ResetSenhaGateway
  ) {
    return new LoginUsuario(usuarioGateway, loginAttemptGateway, refreshTokenGateway, emailGateway, resetSenhaGateway);
  }

  private async enviarEmailBloqueio(nomeUsuario: string, emailUsuario: string, usuarioId: string): Promise<void> {
    await this.resetSenhaGateway.excluirPorUsuario(usuarioId);
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_EXPIRACAO_MS);
    await this.resetSenhaGateway.salvar({ token, usuarioId, expiresAt });

    const link = buildFrontendAppLink(`/reset-senha?token=${token}`);
    await this.emailGateway.enviar({
      para: emailUsuario,
      assunto: "Sua conta foi bloqueada por excesso de tentativas - MTG Championship",
      html: `
        <h2>Olá, ${nomeUsuario}!</h2>
        <p>Sua conta foi <strong>temporariamente bloqueada</strong> por excesso de tentativas de login incorretas.</p>
        <p>Para desbloquear sua conta e recuperar o acesso, redefina sua senha clicando no botão abaixo. O link expira em <strong>1 hora</strong>.</p>
        <p><a href="${link}" style="background:#6d28d9;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Redefinir senha e desbloquear conta</a></p>
        <p>Se você não reconhece essas tentativas, recomendamos que você altere sua senha imediatamente.</p>
      `,
    });
  }

  public async executar(
    input: LoginUsuarioInputDto
  ): Promise<LoginUsuarioOutputDto> {
    const falhas = await this.loginAttemptGateway.obterFalhas(input.email);
    if (falhas >= MAX_TENTATIVAS) {
      throw ErroPersonalizado.criar({
        mensagem: "Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em 15 minutos.",
        status: StatusErro.erroMuitasRequisicoes,
      });
    }

    const usuario = await this.usuarioGateway.buscarPorEmail(input.email);

    if (!usuario) {
      await this.loginAttemptGateway.registrarFalha(input.email);
      throw ErroPersonalizado.criar({
        mensagem: "Credenciais inválidas.",
        status: StatusErro.erroNaoAutorizado,
      });
    }

    if (usuario.excluido) {
      throw ErroPersonalizado.criar({
        mensagem: "Esta conta foi excluída e não pode mais ser acessada.",
        status: StatusErro.erroProibido,
      });
    }

    const senhaValida = await bcrypt.compare(input.senha, usuario.senha);

    if (!senhaValida) {
      await this.loginAttemptGateway.registrarFalha(input.email);

      // Esta falha atinge o limite: bloquear e enviar e-mail de desbloqueio + reset de senha
      if (falhas + 1 >= MAX_TENTATIVAS) {
        await this.enviarEmailBloqueio(usuario.nome, usuario.email, usuario.id);
      }

      throw ErroPersonalizado.criar({
        mensagem: "Credenciais inválidas.",
        status: StatusErro.erroNaoAutorizado,
      });
    }

    await this.loginAttemptGateway.resetar(input.email);

    const token = signToken(
      {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        role: usuario.role,
      },
      "30m"
    );

    if (!token) {
      throw ErroPersonalizado.criar({
        mensagem: "Erro interno do servidor.",
        status: StatusErro.erroServidor,
      });
    }

    const refreshTokenStr = uuidv4();
    await this.refreshTokenGateway.salvar({
      token: refreshTokenStr,
      usuarioId: usuario.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    return {
      token,
      refreshToken: refreshTokenStr,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        telefone: usuario.telefone,
        nickMTGO: usuario.nickMTGO,
        nickArena: usuario.nickArena,
      },
    };
  }
}
