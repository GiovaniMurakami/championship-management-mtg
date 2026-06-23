import nodemailer from "nodemailer";
import { EmailGateway, EnviarEmailInput } from "../../dominio/gateway/emailGateway";
import { logger } from "../../helpers/logger";
import { comRetry } from "../../helpers/retry";

const EMAIL_TIMEOUT_MS = 10_000;
const EMAIL_TENTATIVAS = 2;
const EMAIL_DELAY_MS = 500;

export class EmailServico implements EmailGateway {
    private transporter: nodemailer.Transporter | null;

    private constructor() {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            this.transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });
        } else {
            this.transporter = null;
        }
    }

    public static criar() {
        return new EmailServico();
    }

    public async enviar({ para, assunto, html }: EnviarEmailInput): Promise<void> {
        if (!this.transporter) {
            logger.warn({ para, assunto }, "[EmailServico] credenciais ausentes, email não enviado");
            return;
        }

        try {
            await comRetry(
                () => this.enviarComTimeout({ para, assunto, html }),
                EMAIL_TENTATIVAS,
                EMAIL_DELAY_MS,
                (err) => {
                    const msg = err instanceof Error ? err.message : "";
                    return msg.includes("timeout") || msg.includes("ETIMEDOUT") || msg.includes("ECONNECTION");
                }
            );
        } catch (err) {
            logger.error({ err, para, assunto }, "[EmailServico] falha ao enviar email após tentativas");
        }
    }

    private async enviarComTimeout({ para, assunto, html }: EnviarEmailInput): Promise<void> {
        const envio = this.transporter!.sendMail({
            from: `"MTG Championship" <${process.env.EMAIL_USER}>`,
            to: para,
            subject: assunto,
            html,
        });

        const timeout = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Email timeout")), EMAIL_TIMEOUT_MS);
        });

        await Promise.race([envio, timeout]);
    }
}
