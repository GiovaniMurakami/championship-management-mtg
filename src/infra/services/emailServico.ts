import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { EmailGateway, EnviarEmailInput } from "../../dominio/gateway/emailGateway";
import { logger } from "../../helpers/logger";
import { comRetry } from "../../helpers/retry";

const EMAIL_TIMEOUT_MS = 10_000;
const EMAIL_TENTATIVAS = 2;
const EMAIL_DELAY_MS = 500;

export class EmailServico implements EmailGateway {
    private readonly client: SESClient | null;
    private readonly remetente: string | null;

    private constructor() {
        this.remetente = process.env.SES_FROM_EMAIL?.trim() || null;
        this.client = this.remetente
            ? new SESClient({ region: process.env.SES_REGION?.trim() || process.env.AWS_REGION || "us-east-1" })
            : null;
    }

    public static criar() {
        return new EmailServico();
    }

    public async enviar(input: EnviarEmailInput): Promise<void> {
        if (!this.client || !this.remetente) {
            logger.warn({ para: input.para, assunto: input.assunto }, "[EmailServico] SES_FROM_EMAIL ausente, email não enviado");
            return;
        }

        try {
            await comRetry(
                () => this.enviarComTimeout(input), EMAIL_TENTATIVAS, EMAIL_DELAY_MS,
                (err) => {
                    const nome = err instanceof Error ? err.name : "";
                    const mensagem = err instanceof Error ? err.message : "";
                    return nome === "TimeoutError" || nome === "ThrottlingException" || mensagem.includes("timeout");
                }
            );
        } catch (err) {
            logger.error({ err, para: input.para, assunto: input.assunto }, "[EmailServico] falha ao enviar email pelo SES após tentativas");
        }
    }

    private async enviarComTimeout({ para, assunto, html, texto }: EnviarEmailInput): Promise<void> {
        const envio = this.client!.send(new SendEmailCommand({
            Source: this.remetente!,
            Destination: { ToAddresses: [para] },
            Message: {
                Subject: { Data: assunto, Charset: "UTF-8" },
                Body: {
                    Html: { Data: html, Charset: "UTF-8" },
                    ...(texto ? { Text: { Data: texto, Charset: "UTF-8" } } : {}),
                },
            },
        }));
        let timeoutId: ReturnType<typeof setTimeout>;
        const timeout = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error("Email timeout")), EMAIL_TIMEOUT_MS);
        });
        try {
            await Promise.race([envio, timeout]);
        } finally {
            clearTimeout(timeoutId!);
        }
    }
}
