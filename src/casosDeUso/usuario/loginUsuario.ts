import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { LoginAttemptGateway } from "../../dominio/gateway/loginAttemptGateway";
import { RefreshTokenGateway } from "../../dominio/gateway/refreshTokenGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { signToken } from "../../helpers/jwt";

const MAX_TENTATIVAS = 5;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

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
    private readonly refreshTokenGateway: RefreshTokenGateway
  ) { }

  public static criar(
    usuarioGateway: UsuarioGateway,
    loginAttemptGateway: LoginAttemptGateway,
    refreshTokenGateway: RefreshTokenGateway
  ) {
    return new LoginUsuario(usuarioGateway, loginAttemptGateway, refreshTokenGateway);
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

    const senhaValida = await bcrypt.compare(input.senha, usuario.senha);

    if (!senhaValida) {
      await this.loginAttemptGateway.registrarFalha(input.email);
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
