import { randomUUID } from "crypto";
import { S3Gateway } from "../../dominio/gateway/s3Gateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

const TIPOS_PERMITIDOS = ["avatar", "banner-torneio", "banner-liga", "logo-time"] as const;
const CONTENT_TYPES_PERMITIDOS = ["image/webp", "image/jpeg", "image/png"] as const;

type TipoUpload = typeof TIPOS_PERMITIDOS[number];
type ContentTypePermitido = typeof CONTENT_TYPES_PERMITIDOS[number];

const EXTENSAO: Record<ContentTypePermitido, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpeg",
  "image/png": "png",
};

export type GerarPresignedUrlInputDto = {
  usuarioId: string;
  tipo: string;
  contentType: string;
  expiracaoSegundos?: number;
};

export type GerarPresignedUrlOutputDto = {
  uploadUrl: string;
  fileUrl: string;
  chave: string;
};

export class GerarPresignedUrl
  implements CasoDeUso<GerarPresignedUrlInputDto, GerarPresignedUrlOutputDto>
{
  private constructor(private readonly s3Gateway: S3Gateway) {}

  public static criar(s3Gateway: S3Gateway) {
    return new GerarPresignedUrl(s3Gateway);
  }

  public async executar(input: GerarPresignedUrlInputDto): Promise<GerarPresignedUrlOutputDto> {
    if (!TIPOS_PERMITIDOS.includes(input.tipo as TipoUpload)) {
      throw ErroPersonalizado.criar({
        mensagem: `Tipo inválido. Permitidos: ${TIPOS_PERMITIDOS.join(", ")}.`,
        status: StatusErro.erroParametro,
      });
    }

    if (!CONTENT_TYPES_PERMITIDOS.includes(input.contentType as ContentTypePermitido)) {
      throw ErroPersonalizado.criar({
        mensagem: `Content-Type inválido. Permitidos: ${CONTENT_TYPES_PERMITIDOS.join(", ")}.`,
        status: StatusErro.erroParametro,
      });
    }

    const ext = EXTENSAO[input.contentType as ContentTypePermitido];
    const chave = `${input.tipo}/${input.usuarioId}/${randomUUID()}.${ext}`;

    const { uploadUrl, fileUrl } = await this.s3Gateway.gerarPresignedUrl({
      chave,
      contentType: input.contentType,
      expiracaoSegundos: input.expiracaoSegundos,
    });

    return { uploadUrl, fileUrl, chave };
  }
}
