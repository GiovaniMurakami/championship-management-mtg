import { buildFrontendAppLink, getCorsOrigin, getCorsOrigins, getFrontendUrl, isExecucaoLocal, getS3Bucket, getS3Region, getS3BaseUrl } from "../../src/helpers/env";

describe("env helpers", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env = { ...originalEnv };
        delete process.env.IS_LOCAL;
        delete process.env.FRONTEND_URL;
        delete process.env.CORS_ORIGIN;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it("identifica execução local quando IS_LOCAL=true", () => {
        process.env.IS_LOCAL = "true";

        expect(isExecucaoLocal()).toBe(true);
        expect(getFrontendUrl()).toBe("http://localhost:5173");
        expect(getCorsOrigin()).toBe("http://localhost:5173");
        expect(getCorsOrigins()).toEqual([
            "https://homolog.d32mjk9mbam2cb.amplifyapp.com",
            "https://tiagofuguete.com.br/app-torneios",
            "https://tiagofuguete.com.br",
            "http://localhost:5173",
        ]);
    });

    it("usa URLs configuradas quando não está local", () => {
        process.env.IS_LOCAL = "false";
        process.env.FRONTEND_URL = "https://app.exemplo.com";
        process.env.CORS_ORIGIN = "https://web.exemplo.com";

        expect(isExecucaoLocal()).toBe(false);
        expect(getFrontendUrl()).toBe("https://app.exemplo.com");
        expect(getCorsOrigin()).toBe("https://web.exemplo.com");
    });

    it("reaproveita FRONTEND_URL no CORS quando CORS_ORIGIN não foi definido", () => {
        process.env.FRONTEND_URL = "https://app.exemplo.com";

        expect(getCorsOrigin()).toBe("https://app.exemplo.com");
    });

    it("combina múltiplas origens configuradas com localhost sem duplicar", () => {
        process.env.IS_LOCAL = "false";
        process.env.CORS_ORIGIN = "https://web.exemplo.com, https://admin.exemplo.com";
        process.env.FRONTEND_URL = "https://web.exemplo.com";

        expect(getCorsOrigins()).toEqual([
            "https://web.exemplo.com",
            "https://admin.exemplo.com",
            "https://homolog.d32mjk9mbam2cb.amplifyapp.com",
            "https://tiagofuguete.com.br/app-torneios",
            "https://tiagofuguete.com.br",
            "http://localhost:5173",
        ]);
    });

    it("usa homolog como frontend padrão fora do ambiente local", () => {
        process.env.IS_LOCAL = "false";

        expect(getFrontendUrl()).toBe("https://homolog.d32mjk9mbam2cb.amplifyapp.com");
        expect(getCorsOrigins()).toEqual([
            "https://homolog.d32mjk9mbam2cb.amplifyapp.com",
            "https://tiagofuguete.com.br/app-torneios",
            "https://tiagofuguete.com.br",
            "http://localhost:5173",
        ]);
    });

    it("ignora FRONTEND_URL localhost fora do ambiente local", () => {
        process.env.IS_LOCAL = "false";
        process.env.FRONTEND_URL = "http://localhost:5173";

        expect(getFrontendUrl()).toBe("https://homolog.d32mjk9mbam2cb.amplifyapp.com");
    });

    it("monta link local direto no ambiente de desenvolvimento sem FRONTEND_URL", () => {
        process.env.IS_LOCAL = "true";
        delete process.env.FRONTEND_URL;

        expect(buildFrontendAppLink("/reset-senha?token=abc123")).toBe(
            "http://localhost:5173/reset-senha?token=abc123",
        );
    });

    it("usa FRONTEND_URL no link mesmo com IS_LOCAL=true", () => {
        process.env.IS_LOCAL = "true";
        process.env.FRONTEND_URL = "https://tiagofuguete.com.br/app-torneios";

        expect(buildFrontendAppLink("/reset-senha?token=abc123")).toBe(
            "https://tiagofuguete.com.br/app-torneios?appPath=%2Freset-senha%3Ftoken%3Dabc123",
        );
    });

    it("monta link externo com appPath fora do ambiente local", () => {
        process.env.IS_LOCAL = "false";
        delete process.env.FRONTEND_URL;

        expect(buildFrontendAppLink("/reset-senha?token=abc123")).toBe(
            "https://tiagofuguete.com.br/app-torneios?appPath=%2Freset-senha%3Ftoken%3Dabc123",
        );
    });

    it("usa FRONTEND_URL configurado como base do appPath", () => {
        process.env.IS_LOCAL = "false";
        process.env.FRONTEND_URL = "https://homolog.d32mjk9mbam2cb.amplifyapp.com";

        expect(buildFrontendAppLink("/reset-senha?token=abc123")).toBe(
            "https://homolog.d32mjk9mbam2cb.amplifyapp.com?appPath=%2Freset-senha%3Ftoken%3Dabc123",
        );
    });

    it("IS_LOCAL=1 também é reconhecido como execução local", () => {
        process.env.IS_LOCAL = "1";
        expect(isExecucaoLocal()).toBe(true);
    });

    it("IS_LOCAL ausente retorna false", () => {
        expect(isExecucaoLocal()).toBe(false);
    });

    describe("S3 helpers", () => {
        beforeEach(() => {
            delete process.env.AWS_S3_BUCKET;
            delete process.env.AWS_S3_REGION;
        });

        it("getS3Bucket retorna string vazia quando não configurado", () => {
            expect(getS3Bucket()).toBe("");
        });

        it("getS3Bucket retorna o valor do env quando configurado", () => {
            process.env.AWS_S3_BUCKET = "meu-bucket";
            expect(getS3Bucket()).toBe("meu-bucket");
        });

        it("getS3Region retorna us-east-1 como padrão", () => {
            expect(getS3Region()).toBe("us-east-1");
        });

        it("getS3Region retorna o valor do env quando configurado", () => {
            process.env.AWS_S3_REGION = "sa-east-1";
            expect(getS3Region()).toBe("sa-east-1");
        });

        it("getS3BaseUrl monta a URL corretamente", () => {
            process.env.AWS_S3_BUCKET = "meu-bucket";
            process.env.AWS_S3_REGION = "us-east-1";
            expect(getS3BaseUrl()).toBe("https://meu-bucket.s3.us-east-1.amazonaws.com");
        });
    });
});
