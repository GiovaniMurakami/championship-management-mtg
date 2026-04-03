import { GerarUrlUploadImagem, TAMANHO_MAXIMO_BYTES, TIPOS_IMAGEM_PERMITIDOS } from "../../../src/casosDeUso/imagem/gerarUrlUploadImagem";
import { criarMockImagemGateway } from "../../mocks/gateways";

describe("GerarUrlUploadImagem", () => {
    const usuarioId = "user-1";
    const uploadUrl = "https://bucket.s3.us-east-1.amazonaws.com/imagens/user-1/abc.jpeg?X-Amz-Signature=...";

    it("deve gerar URL de upload para image/jpeg com sucesso", async () => {
        const gateway = criarMockImagemGateway({
            gerarUrlUpload: jest.fn().mockResolvedValue({
                uploadUrl,
                urlPublica: "https://bucket.s3.us-east-1.amazonaws.com/imagens/user-1/abc.jpeg",
            }),
        });
        const uc = GerarUrlUploadImagem.criar(gateway);

        const resultado = await uc.executar({
            contentType: "image/jpeg",
            tamanhoBytes: 1024,
            usuarioId,
        });

        expect(resultado.uploadUrl).toBe(uploadUrl);
        expect(resultado.urlPublica).toContain("https://");
        expect(resultado.chave).toMatch(/^imagens\/user-1\/.+\.jpeg$/);
        expect(gateway.gerarUrlUpload).toHaveBeenCalledTimes(1);
    });

    it.each(TIPOS_IMAGEM_PERMITIDOS)(
        "deve aceitar contentType %s",
        async (contentType) => {
            const ext = contentType.split("/")[1];
            const gateway = criarMockImagemGateway({
                gerarUrlUpload: jest.fn().mockResolvedValue({
                    uploadUrl: "https://bucket.s3.amazonaws.com/imagens/user-1/file." + ext,
                    urlPublica: "https://bucket.s3.amazonaws.com/imagens/user-1/file." + ext,
                }),
            });
            const uc = GerarUrlUploadImagem.criar(gateway);

            const resultado = await uc.executar({
                contentType,
                tamanhoBytes: 512,
                usuarioId,
            });

            expect(resultado.chave).toMatch(new RegExp(`\\.${ext}$`));
        }
    );

    it("deve lançar erro 400 para contentType inválido", async () => {
        const gateway = criarMockImagemGateway();
        const uc = GerarUrlUploadImagem.criar(gateway);

        await expect(
            uc.executar({ contentType: "application/pdf", tamanhoBytes: 1024, usuarioId })
        ).rejects.toMatchObject({ status: 400 });

        expect(gateway.gerarUrlUpload).not.toHaveBeenCalled();
    });

    it("deve lançar erro 400 para contentType text/html", async () => {
        const gateway = criarMockImagemGateway();
        const uc = GerarUrlUploadImagem.criar(gateway);

        await expect(
            uc.executar({ contentType: "text/html", tamanhoBytes: 1024, usuarioId })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar erro 400 se tamanhoBytes for 0", async () => {
        const gateway = criarMockImagemGateway();
        const uc = GerarUrlUploadImagem.criar(gateway);

        await expect(
            uc.executar({ contentType: "image/png", tamanhoBytes: 0, usuarioId })
        ).rejects.toMatchObject({ status: 400 });

        expect(gateway.gerarUrlUpload).not.toHaveBeenCalled();
    });

    it("deve lançar erro 400 se tamanhoBytes for negativo", async () => {
        const gateway = criarMockImagemGateway();
        const uc = GerarUrlUploadImagem.criar(gateway);

        await expect(
            uc.executar({ contentType: "image/png", tamanhoBytes: -1, usuarioId })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar erro 400 se tamanhoBytes exceder 5 MB", async () => {
        const gateway = criarMockImagemGateway();
        const uc = GerarUrlUploadImagem.criar(gateway);

        await expect(
            uc.executar({ contentType: "image/png", tamanhoBytes: TAMANHO_MAXIMO_BYTES + 1, usuarioId })
        ).rejects.toMatchObject({ status: 400 });

        expect(gateway.gerarUrlUpload).not.toHaveBeenCalled();
    });

    it("deve aceitar tamanhoBytes exatamente no limite de 5 MB", async () => {
        const gateway = criarMockImagemGateway({
            gerarUrlUpload: jest.fn().mockResolvedValue({
                uploadUrl: "https://bucket.s3.amazonaws.com/imagens/user-1/file.png",
                urlPublica: "https://bucket.s3.amazonaws.com/imagens/user-1/file.png",
            }),
        });
        const uc = GerarUrlUploadImagem.criar(gateway);

        await expect(
            uc.executar({ contentType: "image/png", tamanhoBytes: TAMANHO_MAXIMO_BYTES, usuarioId })
        ).resolves.toBeDefined();
    });

    it("deve gerar chave única por chamada", async () => {
        const gateway = criarMockImagemGateway({
            gerarUrlUpload: jest.fn().mockResolvedValue({
                uploadUrl: "https://bucket.s3.amazonaws.com/key",
                urlPublica: "https://bucket.s3.amazonaws.com/key",
            }),
        });
        const uc = GerarUrlUploadImagem.criar(gateway);

        const [r1, r2] = await Promise.all([
            uc.executar({ contentType: "image/jpeg", tamanhoBytes: 1024, usuarioId }),
            uc.executar({ contentType: "image/jpeg", tamanhoBytes: 1024, usuarioId }),
        ]);

        expect(r1.chave).not.toBe(r2.chave);
    });

    it("deve incluir o usuarioId na chave gerada", async () => {
        const gateway = criarMockImagemGateway({
            gerarUrlUpload: jest.fn().mockResolvedValue({
                uploadUrl: "https://bucket.s3.amazonaws.com/key",
                urlPublica: "https://bucket.s3.amazonaws.com/key",
            }),
        });
        const uc = GerarUrlUploadImagem.criar(gateway);

        const resultado = await uc.executar({
            contentType: "image/webp",
            tamanhoBytes: 2048,
            usuarioId: "usuario-especifico",
        });

        expect(resultado.chave).toContain("usuario-especifico");
    });
});
