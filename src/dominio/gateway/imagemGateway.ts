export type TipoConteudoImagem =
    | "image/jpeg"
    | "image/png"
    | "image/gif"
    | "image/webp";

export interface GerarUrlUploadInput {
    chave: string;
    contentType: TipoConteudoImagem;
    tamanhoBytes: number;
}

export interface GerarUrlUploadOutput {
    uploadUrl: string;
    urlPublica: string;
}

export interface ImagemGateway {
    gerarUrlUpload(input: GerarUrlUploadInput): Promise<GerarUrlUploadOutput>;
}
