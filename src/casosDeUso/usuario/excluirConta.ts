import crypto from "crypto";
import bcrypt from "bcryptjs";
import { CasoDeUso } from "../casoDeUso";
import { RefreshTokenGateway } from "../../dominio/gateway/refreshTokenGateway";
import { ResetSenhaGateway } from "../../dominio/gateway/resetSenhaGateway";
import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { LoginAttemptGateway } from "../../dominio/gateway/loginAttemptGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { USUARIO_EXCLUIDO_NOME } from "../../helpers/torneio/resolverNomeJogador";

export type ExcluirContaInputDto = {
  usuarioId: string;
  confirmacao: string;
};

export type ExcluirContaOutputDto = {
  id: string;
  mensagem: string;
};

export class ExcluirConta implements CasoDeUso<ExcluirContaInputDto, ExcluirContaOutputDto> {
  private constructor(
    private readonly usuarioGateway: UsuarioGateway,
    private readonly torneioGateway: TorneioGateway,
    private readonly timeGateway: TimeGateway,
    private readonly refreshTokenGateway: RefreshTokenGateway,
    private readonly resetSenhaGateway: ResetSenhaGateway,
    private readonly loginAttemptGateway: LoginAttemptGateway,
  ) {}

  public static criar(
    usuarioGateway: UsuarioGateway,
    torneioGateway: TorneioGateway,
    timeGateway: TimeGateway,
    refreshTokenGateway: RefreshTokenGateway,
    resetSenhaGateway: ResetSenhaGateway,
    loginAttemptGateway: LoginAttemptGateway,
  ) {
    return new ExcluirConta(
      usuarioGateway,
      torneioGateway,
      timeGateway,
      refreshTokenGateway,
      resetSenhaGateway,
      loginAttemptGateway,
    );
  }

  public async executar(input: ExcluirContaInputDto): Promise<ExcluirContaOutputDto> {
    const usuario = await this.usuarioGateway.buscarPorId(input.usuarioId);
    if (!usuario) {
      throw ErroPersonalizado.criar({
        mensagem: "Usuário não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (usuario.excluido) {
      throw ErroPersonalizado.criar({
        mensagem: "Esta conta já foi excluída.",
        status: StatusErro.erroParametro,
      });
    }

    if (usuario.role === "admin") {
      throw ErroPersonalizado.criar({
        mensagem: "Contas de administrador não podem ser excluídas por este fluxo.",
        status: StatusErro.erroProibido,
      });
    }

    const confirmacao = input.confirmacao?.trim() ?? "";
    if (!confirmacao || confirmacao !== usuario.nome) {
      throw ErroPersonalizado.criar({
        mensagem: "Digite exatamente o seu nome de perfil para confirmar a exclusão.",
        status: StatusErro.erroParametro,
      });
    }

    const torneiosComoDono = await this.torneioGateway.contarPorDono(usuario.id);
    if (torneiosComoDono > 0) {
      throw ErroPersonalizado.criar({
        mensagem: "Exclua ou transfira os torneios dos quais você é dono antes de apagar a conta.",
        status: StatusErro.erroParametro,
      });
    }

    const times = await this.timeGateway.buscarPorMembros([usuario.id]);
    const timesComoDono = times.filter((time) => time.donoId === usuario.id);
    if (timesComoDono.length > 0) {
      throw ErroPersonalizado.criar({
        mensagem: "Transfira a liderança ou exclua os times dos quais você é dono antes de apagar a conta.",
        status: StatusErro.erroParametro,
      });
    }

    const emailOriginal = usuario.email;
    const senhaAleatoria = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

    usuario.nome = USUARIO_EXCLUIDO_NOME;
    usuario.email = `excluido+${usuario.id}@excluido.local`;
    usuario.senha = senhaAleatoria;
    usuario.telefone = undefined;
    usuario.nickMTGO = undefined;
    usuario.nickArena = undefined;
    usuario.bloqueadoTorneios = true;
    usuario.excluido = true;
    usuario.excluidoEm = new Date();

    await this.torneioGateway.removerAnfitriaoDoUsuario(usuario.id);
    await this.refreshTokenGateway.excluirPorUsuario(usuario.id);
    await this.resetSenhaGateway.excluirPorUsuario(usuario.id);
    await this.loginAttemptGateway.resetar(emailOriginal);
    await this.usuarioGateway.atualizar(usuario);

    return {
      id: usuario.id,
      mensagem: "Conta excluída com sucesso. Decks e histórico de torneios foram preservados.",
    };
  }
}
