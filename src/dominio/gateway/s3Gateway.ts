export type PresignedUrlParams = {
  chave: string;
  contentType: string;
  expiracaoSegundos?: number;
};

export type PresignedUrlResult = {
  uploadUrl: string;
  fileUrl: string;
};

export interface S3Gateway {
  gerarPresignedUrl(params: PresignedUrlParams): Promise<PresignedUrlResult>;
}
