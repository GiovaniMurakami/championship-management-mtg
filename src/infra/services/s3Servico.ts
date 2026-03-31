import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PresignedUrlParams, PresignedUrlResult, S3Gateway } from "../../dominio/gateway/s3Gateway";

export class S3Servico implements S3Gateway {
  private readonly client: S3Client;

  private constructor(
    private readonly bucket: string,
    private readonly region: string
  ) {
    this.client = new S3Client({ region });
  }

  public static criar() {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      throw new Error("AWS_S3_BUCKET environment variable is not set");
    }
    const region = process.env.AWS_REGION ?? "us-east-1";
    return new S3Servico(bucket, region);
  }

  public async gerarPresignedUrl({
    chave,
    contentType,
    expiracaoSegundos = 300,
  }: PresignedUrlParams): Promise<PresignedUrlResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: chave,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: expiracaoSegundos,
    });

    const fileUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${chave}`;

    return { uploadUrl, fileUrl };
  }
}
