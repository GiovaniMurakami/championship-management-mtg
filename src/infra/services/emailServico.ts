import nodemailer from "nodemailer";
import { EmailGateway, EnviarEmailInput } from "../../dominio/gateway/emailGateway";
import { logger } from "../../helpers/logger";

export class EmailServico implements EmailGateway {
    private transporter: nodemailer.Transporter;

    private constructor() {
        this.transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    }

    public static criar() {
        return new EmailServico();
    }

    public async enviar({ para, assunto, html }: EnviarEmailInput): Promise<void> {
        try {
            await this.transporter.sendMail({
                from: `"MTG Championship" <${process.env.EMAIL_USER}>`,
                to: para,
                subject: assunto,
                html,
            });
        } catch (err) {
            logger.error({ err, para, assunto }, "[EmailServico] falha ao enviar email");
        }
    }
}
