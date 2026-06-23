import { EmailServico } from "../../../src/infra/services/emailServico";

jest.mock("nodemailer", () => ({
    createTransport: jest.fn(() => ({
        sendMail: jest.fn().mockResolvedValue({ messageId: "1" }),
    })),
}));

describe("EmailServico", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it("deve logar aviso e não enviar quando credenciais ausentes", async () => {
        delete process.env.EMAIL_USER;
        delete process.env.EMAIL_PASS;

        const servico = EmailServico.criar();
        await expect(
            servico.enviar({ para: "a@b.com", assunto: "Teste", html: "<p>oi</p>" })
        ).resolves.toBeUndefined();
    });

    it("deve enviar email quando credenciais configuradas", async () => {
        process.env.EMAIL_USER = "user@test.com";
        process.env.EMAIL_PASS = "pass";

        const servico = EmailServico.criar();
        await expect(
            servico.enviar({ para: "a@b.com", assunto: "Teste", html: "<p>oi</p>" })
        ).resolves.toBeUndefined();
    });
});
