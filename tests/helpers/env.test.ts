import { getCorsOrigin, getFrontendUrl, isExecucaoLocal, getS3Bucket, getS3Region, getS3BaseUrl } from "../../src/helpers/env";

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