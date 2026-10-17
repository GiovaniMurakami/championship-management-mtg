import { CacheGateway } from "../../dominio/gateway/cacheGateway";
import { SiteConfigGateway, SobreMimConfig } from "../../dominio/gateway/siteConfigGateway";
import { CACHE_PK_SITE } from "../../helpers/cache/chavesCache";
import { getCacheTtlSegundos } from "../../helpers/cache/ttlCache";
import { toBrasiliaISO } from "../../helpers/data/brasilia";

const CACHE_SK = "sobre-mim";

export const SOBRE_MIM_PADRAO: Omit<SobreMimConfig, "atualizadoEm"> = {
  tituloHistoria: "Minha história no Magic",
  historia:
    "Olá, meu nome é Tiago… Mas ninguém me chama assim. Desde pequeno carrego um apelido que não escolhi, mas que hoje faz parte de quem eu sou: Tiago Fuguete.\n\n"
    + "Sempre fui apaixonado por animais, sou pai da Alice e do Tiaguinho, meus dois maiores orgulhos, mas tem outra paixão que me acompanha há muito tempo: o Magic: The Gathering.\n\n"
    + "O que começou como diversão, acabou se tornando um caminho inesperado na minha vida. Alguns anos atrás, comecei a fazer lives na Twitch só por hobby, só pra compartilhar minha paixão pelo Magic com quem também ama o jogo. Até que, num daqueles momentos em que a vida vira do avesso, fui demitido do meu emprego. E ali, no meio da incerteza, tomei a decisão mais corajosa que já fiz: transformar aquilo que me fazia feliz na minha profissão.\n\n"
    + "De forma natural, o canal foi crescendo, a comunidade foi me abraçando, e hoje tenho a honra de ser reconhecido como um dos maiores influenciadores de Magic do Brasil. Magic mudou minha vida. E todos os dias, em cada live, cada torneio, cada conversa, eu tento retribuir isso pra comunidade.",
  fotoUrl: "/images/landing/sobre-mim/sobremim-profile.jpg",
  apoiaTitulo: "Apoie o meu trabalho pelo Apoia-se",
  apoiaTexto: "É graças ao apoio de cada um dos apoiadores que esse sonho se tornou realidade!",
  apoiaImagemUrl: "/images/landing/sobre-mim/apoiase-screenshot.png",
  apoiaUrl: "https://apoia.se/tiagofuguete",
  galeriaTitulo: "Isso é Magic, isso é Tiago Fuguete",
  galeriaUrls: [
    "/images/landing/sobre-mim/gallery-1.jpeg",
    "/images/landing/sobre-mim/gallery-3.jpeg",
    "/images/landing/sobre-mim/gallery-4.jpeg",
    "/images/landing/sobre-mim/gallery-5.jpeg",
    "/images/landing/sobre-mim/gallery-6.jpeg",
  ],
  agradecimentoTitulo: "Obrigado!",
  agradecimentoTexto: "Esse projeto existe graças a cada um de vocês",
  apoiadores:
    "Adilson Roberto Alves Silva; alexandre queiroz galleti; Angelo Graper; Antonio Sérgio Ribeiro Junior; Augusto Alves; Bruno Campitelli Belchior; Bruno Costa Castro Alves; Carlos Eduardo de Aguiar Nogueira Gomes; Cesar Fabricio Klemes da Cruz; Daniel Ruiz Dias; Daniel Seether; DERLI TIAGO CASTILHO DE GODOIS SCHLICK; Diego Nogueira; Dionatan silvestre da silva; Edson Henrique Medeiros Silva; Fabio Lima; FABIO OLIVEIRA COSTA; Fagner Ferreira Barbosa; Felipe José do Nascimento Henrique; Felipe Lapena Barreto; Felipe Pedroso Camargo; Felipe Ramos; Felipe Tavares Batista; Filipe Silqueira Reis; Flavio Augusto de Carvalho Fialho; flavio sarto; FREDERICO ROCHA BAUMGRATZ; isaque angelo de oliveira saboia; João Prado; JORGE FERNANDO KIKUTA; José Rauryson Alves Bezerra; Julio Thibes; LEANDRO FLORESTA DOS SANTOS; Leandro Sanches Bermudes; Luan Kupka; Lucas Ribeiro; Lucas Stamford; Luiz Paulo Feliciano Guedes Pinto; Marcelo Miziara; Marcelo Shanks; Marcos Tadeu Secol Felix; Max Diávila Machado; Miguel Filipe Rodriguez Moure; PAULO GONÇALVES PEREIRA; PEDRO HENRIQUE MANZONI DE LIMA; Regis Lima Claus; Renan Carvalho; Roberto Borzuk Kneip Salimena; robson pereira; Rodrigo Flores; Serra Leno; Thais Vieira Oliveira; THIAGO HENRIQUE DE MATTOS; Vat Alexsandro; Vinicius Santos; VITOR V MORGADO; Yago Busatto Leal",
};

export class BuscarSobreMim {
  private constructor(
    private readonly siteConfigGateway: SiteConfigGateway,
    private readonly cache?: CacheGateway,
  ) {}

  public static criar(siteConfigGateway: SiteConfigGateway, cache?: CacheGateway) {
    return new BuscarSobreMim(siteConfigGateway, cache);
  }

  public async executar() {
    const versaoCache = await this.cache?.obterVersao(CACHE_PK_SITE);
    const cacheado = await this.cache?.buscar<Record<string, unknown>>(
      CACHE_PK_SITE,
      CACHE_SK,
      versaoCache,
    );
    if (cacheado) return cacheado;

    const config = await this.siteConfigGateway.buscarSobreMim();
    const saida = {
      tituloHistoria: config?.tituloHistoria || SOBRE_MIM_PADRAO.tituloHistoria,
      historia: config?.historia || SOBRE_MIM_PADRAO.historia,
      fotoUrl: config?.fotoUrl || SOBRE_MIM_PADRAO.fotoUrl,
      apoiaTitulo: config?.apoiaTitulo || SOBRE_MIM_PADRAO.apoiaTitulo,
      apoiaTexto: config?.apoiaTexto || SOBRE_MIM_PADRAO.apoiaTexto,
      apoiaImagemUrl: config?.apoiaImagemUrl || SOBRE_MIM_PADRAO.apoiaImagemUrl,
      apoiaUrl: config?.apoiaUrl || SOBRE_MIM_PADRAO.apoiaUrl,
      galeriaTitulo: config?.galeriaTitulo || SOBRE_MIM_PADRAO.galeriaTitulo,
      galeriaUrls: (config?.galeriaUrls?.length ? config.galeriaUrls : SOBRE_MIM_PADRAO.galeriaUrls),
      agradecimentoTitulo: config?.agradecimentoTitulo || SOBRE_MIM_PADRAO.agradecimentoTitulo,
      agradecimentoTexto: config?.agradecimentoTexto || SOBRE_MIM_PADRAO.agradecimentoTexto,
      apoiadores: config?.apoiadores || SOBRE_MIM_PADRAO.apoiadores,
      atualizadoEm: config?.atualizadoEm ? toBrasiliaISO(config.atualizadoEm) : null,
    };

    await this.cache?.salvar(
      CACHE_PK_SITE,
      CACHE_SK,
      saida,
      getCacheTtlSegundos("DYNAMODB_CACHE_TTL_SITE_SECONDS", 300),
      versaoCache,
    );
    return saida;
  }
}
