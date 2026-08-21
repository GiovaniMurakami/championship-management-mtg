import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { CacheDynamoDbServico, getCacheTtlSegundos } from "../../infra/services/cacheDynamoDbServico";
import { cachePkTorneio, cacheSkSeoTorneio } from "../../helpers/cache/chavesCache";

export type BuscarSeoTorneioInputDto = {
  torneioId: string;
};

export type BuscarSeoTorneioOutputDto = {
  torneioId: string;
  title: string;
  image: string | null;
  /** MIME type da imagem (para og:image:type). */
  imageType: string | null;
  description: string | null;
  url: string | null;
};

const DESCRIPTION_MAX = 200;

/** Colapsa whitespace/newlines e trunca para meta tags HTML/OG. */
export function sanitizarDescricaoSeo(texto: string | undefined | null): string | null {
  if (!texto) return null;
  const limpo = texto
    .replace(/\r\n|\r|\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!limpo) return null;
  if (limpo.length <= DESCRIPTION_MAX) return limpo;
  return `${limpo.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…`;
}

export function detectarImageType(url: string | null | undefined): string | null {
  if (!url) return null;
  const path = url.split("?")[0].toLowerCase();
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

export class BuscarSeoTorneio
  implements CasoDeUso<BuscarSeoTorneioInputDto, BuscarSeoTorneioOutputDto> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly cache?: CacheDynamoDbServico
  ) { }

  public static criar(torneioGateway: TorneioGateway, cache?: CacheDynamoDbServico) {
    return new BuscarSeoTorneio(torneioGateway, cache);
  }

  public async executar(input: BuscarSeoTorneioInputDto): Promise<BuscarSeoTorneioOutputDto> {
    const cachePk = cachePkTorneio(input.torneioId);
    const cacheSk = cacheSkSeoTorneio();
    const cacheado = await this.cache?.buscar<BuscarSeoTorneioOutputDto>(cachePk, cacheSk);
    if (cacheado) return cacheado;

    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio nao encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    const image = torneio.bannerUrl?.trim() || null;

    const saida = {
      torneioId: torneio.id,
      title: torneio.nome,
      image,
      imageType: detectarImageType(image),
      description: sanitizarDescricaoSeo(torneio.descricao),
      url: torneio.linkBanner?.trim() || null,
    };
    await this.cache?.salvar(cachePk, cacheSk, saida, getCacheTtlSegundos("DYNAMODB_CACHE_TTL_SEO_TORNEIO_SECONDS", 1800));
    return saida;
  }
}
