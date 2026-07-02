import crypto from "crypto";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { ResetSenhaGateway } from "../../dominio/gateway/resetSenhaGateway";
import { EmailGateway } from "../../dominio/gateway/emailGateway";
import { CasoDeUso } from "../casoDeUso";
import { buildFrontendAppLink } from "../../helpers/env";

const EXPIRACAO_MS = 60 * 60 * 1000; // 1 hora

export type SolicitarResetSenhaInputDto = {
    email: string;
};

export type SolicitarResetSenhaOutputDto = {
    mensagem: string;
};

export class SolicitarResetSenha
    implements CasoDeUso<SolicitarResetSenhaInputDto, SolicitarResetSenhaOutputDto> {
    private constructor(
        private readonly usuarioGateway: UsuarioGateway,
        private readonly resetSenhaGateway: ResetSenhaGateway,
        private readonly emailGateway: EmailGateway
    ) { }

    public static criar(
        usuarioGateway: UsuarioGateway,
        resetSenhaGateway: ResetSenhaGateway,
        emailGateway: EmailGateway
    ) {
        return new SolicitarResetSenha(usuarioGateway, resetSenhaGateway, emailGateway);
    }

    public async executar(
        input: SolicitarResetSenhaInputDto
    ): Promise<SolicitarResetSenhaOutputDto> {
        const usuario = await this.usuarioGateway.buscarPorEmail(input.email);

        // Resposta genérica para não revelar se o email existe
        const respostaGenerica = {
            mensagem: "Se o e-mail estiver cadastrado, você receberá as instruções em breve.",
        };

        if (!usuario) return respostaGenerica;

        await this.resetSenhaGateway.excluirPorUsuario(usuario.id);

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + EXPIRACAO_MS);

        await this.resetSenhaGateway.salvar({ token, usuarioId: usuario.id, expiresAt });

        const link = buildFrontendAppLink(`/reset-senha?token=${token}`);

        await this.emailGateway.enviar({
            para: usuario.email,
            assunto: "Redefinição de senha - Fuguete",
            html: `
        <h2>Olá, ${usuario.nome}!</h2>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <p>Clique no link abaixo para criar uma nova senha. O link expira em <strong>1 hora</strong>.</p>
        <p><a href="${link}" style="background:#6d28d9;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Redefinir senha</a></p>
        <p>Se você não solicitou isso, ignore este e-mail.</p>
      `,
        });

        return respostaGenerica;
    }
}
