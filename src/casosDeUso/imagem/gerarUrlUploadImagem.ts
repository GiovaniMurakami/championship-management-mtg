import { v4 as uuidv4 } from "uuid";
import {
    ImagemGateway,
    TipoConteudoImagem,
} from "../../dominio/gateway/imagemGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export const TIPOS_IMAGEM_PERMITIDOS: TipoConteudoImagem[] = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
];

export const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB

export type GerarUrlUploadImagemInputDto = {
    contentType: string;
    tamanhoBytes: number;
    usuarioId: string;
};

export type GerarUrlUploadImagemOutputDto = {
    uploadUrl: string;
    urlPublica: string;
    chave: string;
};

export class GerarUrlUploadImagem
    implements CasoDeUso<GerarUrlUploadImagemInputDto, GerarUrlUploadImagemOutputDto> {
    private constructor(private readonly imagemGateway: ImagemGateway) { }

    public static criar(imagemGateway: ImagemGateway): GerarUrlUploadImagem {
        return new GerarUrlUploadImagem(imagemGateway);
    }

    public async executar(
        input: GerarUrlUploadImagemInputDto
    ): Promise<GerarUrlUploadImagemOutputDto> {
        if (!TIPOS_IMAGEM_PERMITIDOS.includes(input.contentType as TipoConteudoImagem)) {
            throw ErroPersonalizado.criar({
                mensagem: `Tipo de imagem não permitido. Use: ${TIPOS_IMAGEM_PERMITIDOS.join(", ")}.`,
                status: StatusErro.erroParametro,
            });
        }

        if (input.tamanhoBytes <= 0 || input.tamanhoBytes > TAMANHO_MAXIMO_BYTES) {
            throw ErroPersonalizado.criar({
                mensagem: `Tamanho da imagem inválido. O limite é ${TAMANHO_MAXIMO_BYTES / 1024 / 1024} MB.`,
                status: StatusErro.erroParametro,
            });
        }

        const extensao = (input.contentType as TipoConteudoImagem).split("/")[1];
        const chave = `imagens/${input.usuarioId}/${uuidv4()}.${extensao}`;

        const { uploadUrl, urlPublica } = await this.imagemGateway.gerarUrlUpload({
            chave,
            contentType: input.contentType as TipoConteudoImagem,
            tamanhoBytes: input.tamanhoBytes,
        });

        return { uploadUrl, urlPublica, chave };
    }
}
