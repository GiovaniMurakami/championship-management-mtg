import { DeleteObjectCommand, S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
    GerarUrlUploadInput,
    GerarUrlUploadOutput,
    ImagemGateway,
} from "../../dominio/gateway/imagemGateway";
import { getS3Bucket, getS3BaseUrl, getS3Region } from "../../helpers/env";

const URL_EXPIRACAO_SEGUNDOS = 300; // 5 minutos

export class S3Servico implements ImagemGateway {
    private readonly client: S3Client;
    private readonly bucket: string;

    private constructor() {
        this.bucket = getS3Bucket();
        this.client = new S3Client({
            region: getS3Region(),
            requestChecksumCalculation: "WHEN_REQUIRED",
            responseChecksumValidation: "WHEN_REQUIRED",
        });
    }

    public static criar(): S3Servico {
        return new S3Servico();
    }

    public async gerarUrlUpload(
        input: GerarUrlUploadInput
    ): Promise<GerarUrlUploadOutput> {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: input.chave,
            ContentType: input.contentType,
        });

        const uploadUrl = await getSignedUrl(this.client, command, {
            expiresIn: URL_EXPIRACAO_SEGUNDOS,
        });

        const urlPublica = `${getS3BaseUrl()}/${input.chave}`;

        return { uploadUrl, urlPublica };
    }

    public async excluirPorUrl(urlPublica: string): Promise<void> {
        const base = `${getS3BaseUrl()}/`;
        if (!urlPublica.startsWith(base)) {
            throw new Error("URL de imagem fora do bucket S3 autorizado.");
        }
        const chave = decodeURIComponent(urlPublica.slice(base.length).split("?")[0]);
        if (!chave) throw new Error("Chave da imagem S3 inválida.");
        await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: chave }));
    }
}
