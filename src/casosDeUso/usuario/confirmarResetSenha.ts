import bcrypt from "bcryptjs";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { ResetSenhaGateway } from "../../dominio/gateway/resetSenhaGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

const SENHA_MIN = 8;

export type ConfirmarResetSenhaInputDto = {
    token: string;
    novaSenha: string;
};

export type ConfirmarResetSenhaOutputDto = {
    mensagem: string;
};

export class ConfirmarResetSenha
    implements CasoDeUso<ConfirmarResetSenhaInputDto, ConfirmarResetSenhaOutputDto> {
    private constructor(
        private readonly usuarioGateway: UsuarioGateway,
        private readonly resetSenhaGateway: ResetSenhaGateway
    ) { }

    public static criar(
        usuarioGateway: UsuarioGateway,
        resetSenhaGateway: ResetSenhaGateway
    ) {
        return new ConfirmarResetSenha(usuarioGateway, resetSenhaGateway);
    }

    public async executar(
        input: ConfirmarResetSenhaInputDto
    ): Promise<ConfirmarResetSenhaOutputDto> {
        if (input.novaSenha.length < SENHA_MIN) {
            throw ErroPersonalizado.criar({
                mensagem: `A nova senha deve ter pelo menos ${SENHA_MIN} caracteres.`,
                status: StatusErro.erroParametro,
            });
        }

        const dados = await this.resetSenhaGateway.buscarPorToken(input.token);

        if (!dados || dados.expiresAt < new Date()) {
            await this.resetSenhaGateway.excluirPorToken(input.token);
            throw ErroPersonalizado.criar({
                mensagem: "Token inválido ou expirado.",
                status: StatusErro.erroParametro,
            });
        }

        const usuario = await this.usuarioGateway.buscarPorId(dados.usuarioId);

        if (!usuario) {
            throw ErroPersonalizado.criar({
                mensagem: "Usuário não encontrado.",
                status: StatusErro.erroNaoEncontrado,
            });
        }

        usuario.senha = await bcrypt.hash(input.novaSenha, 12);
        await this.usuarioGateway.atualizar(usuario);
        await this.resetSenhaGateway.excluirPorToken(input.token);

        return { mensagem: "Senha redefinida com sucesso." };
    }
}
