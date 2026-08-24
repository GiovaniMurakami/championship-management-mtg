import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { EmailServico } from "../../../src/infra/services/emailServico";

const sendMock = jest.fn().mockResolvedValue({ MessageId: "1" });

jest.mock("@aws-sdk/client-ses", () => ({
    SESClient: jest.fn().mockImplementation(() => ({ send: sendMock })),
    SendEmailCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

describe("EmailServico", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        sendMock.mockResolvedValue({ MessageId: "1" });
        process.env = { ...originalEnv };
    });

    afterAll(() => { process.env = originalEnv; });

    it("não cria cliente nem envia quando SES_FROM_EMAIL está ausente", async () => {
        delete process.env.SES_FROM_EMAIL;
        const servico = EmailServico.criar();
        await servico.enviar({ para: "a@b.com", assunto: "Teste", html: "<p>oi</p>", texto: "oi" });
        expect(SESClient).not.toHaveBeenCalled();
        expect(sendMock).not.toHaveBeenCalled();
    });

    it("envia HTML e texto pelo SES quando o remetente está configurado", async () => {
        process.env.SES_FROM_EMAIL = "Fuguete <noreply@tiagofuguete.com.br>";
        process.env.SES_REGION = "us-east-1";
        const servico = EmailServico.criar();
        await servico.enviar({ para: "a@b.com", assunto: "Teste", html: "<p>oi</p>", texto: "oi" });

        expect(SESClient).toHaveBeenCalledWith({ region: "us-east-1" });
        expect(SendEmailCommand).toHaveBeenCalledWith(expect.objectContaining({
            Source: "Fuguete <noreply@tiagofuguete.com.br>",
            Destination: { ToAddresses: ["a@b.com"] },
        }));
        expect(sendMock).toHaveBeenCalledTimes(1);
    });
});
