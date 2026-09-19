import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { EmailGateway } from "../../dominio/gateway/emailGateway";
import { ListarMetagame } from "../metagame/listarMetagame";
import {
  criarEmailNewsletterMetagame,
  NewsletterFormatoSecao,
} from "../../infra/services/templatesEmail";
import { getFrontendUrl } from "../../helpers/env";
import { logger } from "../../helpers/logger";
import { criarTokenDescadastroNewsletter } from "../../helpers/newsletterToken";

const FORMATOS_NEWSLETTER: { formato: string; label: string }[] = [
  { formato: "pauper", label: "Pauper" },
  { formato: "standard", label: "Standard" },
  { formato: "modern", label: "Modern" },
  { formato: "pioneer", label: "Pioneer" },
  { formato: "commander", label: "Commander" },
  { formato: "commander500", label: "Commander 500" },
];

const TOP_ARQUETIPOS = 5;
const DELAY_ENTRE_ENVIOS_MS = 120;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class EnviarNewsletterMetagameSemanal {
  private constructor(
    private readonly usuarioGateway: UsuarioGateway,
    private readonly listarMetagame: ListarMetagame,
    private readonly emailGateway: EmailGateway,
  ) {}

  public static criar(
    usuarioGateway: UsuarioGateway,
    listarMetagame: ListarMetagame,
    emailGateway: EmailGateway,
  ) {
    return new EnviarNewsletterMetagameSemanal(usuarioGateway, listarMetagame, emailGateway);
  }

  public async executar(opcoes: { dias?: number; assuntoPrefixo?: string } = {}) {
    const dias = opcoes.dias && opcoes.dias > 0 ? opcoes.dias : 7;
    const assinantes = await this.usuarioGateway.listar({
      excluido: false,
      newsletterMetagame: true,
    });

    if (assinantes.length === 0) {
      logger.info("newsletter metagame: nenhum assinante");
      return { assinantes: 0, enviados: 0, falhas: 0, secoes: 0, dias };
    }

    const baseUrl = getFrontendUrl().replace(/\/$/, "");
    const secoes: NewsletterFormatoSecao[] = [];

    for (const { formato, label } of FORMATOS_NEWSLETTER) {
      try {
        const metagame = await this.listarMetagame.executar({
          formato,
          dias,
          limite: TOP_ARQUETIPOS,
          offset: 0,
        });
        if (!metagame.totalDecks) continue;

        secoes.push({
          formato,
          label,
          totalTorneios: metagame.totalTorneios,
          totalDecks: metagame.totalDecks,
          link: `${baseUrl}/metagame?formato=${encodeURIComponent(formato)}&dias=${dias}`,
          arquetipos: (metagame.arquetipos ?? []).slice(0, TOP_ARQUETIPOS).map((a) => ({
            nome: a.nome || a.slug || "Arquétipo",
            metaPercentual: a.metaPct ?? 0,
            winrate: a.winrate,
            totalDecks: a.copias,
          })),
        });
      } catch (err) {
        logger.error({ err, formato }, "newsletter metagame: falha ao agregar formato");
      }
    }

    let enviados = 0;
    let falhas = 0;
    const linkPreferencias = `${baseUrl}/?newsletter=preferencias`;
    const assunto = opcoes.assuntoPrefixo
      ? `${opcoes.assuntoPrefixo} Metagame da semana — Fuguete`
      : "Metagame da semana — Fuguete";

    for (const usuario of assinantes) {
      if (!usuario.email || usuario.excluido) continue;
      const token = criarTokenDescadastroNewsletter(usuario.id);
      const linkDescadastro = `${baseUrl}/newsletter/descadastrar?token=${encodeURIComponent(token)}`;
      const email = criarEmailNewsletterMetagame({
        nome: usuario.nome || "jogador",
        secoes,
        linkPreferencias,
        linkDescadastro,
      });
      try {
        await this.emailGateway.enviar({
          para: usuario.email,
          assunto,
          html: email.html,
          texto: email.texto,
        });
        enviados += 1;
      } catch (err) {
        falhas += 1;
        logger.error({ err, usuarioId: usuario.id }, "newsletter metagame: falha no envio");
      }
      await sleep(DELAY_ENTRE_ENVIOS_MS);
    }

    logger.info(
      { assinantes: assinantes.length, enviados, falhas, secoes: secoes.length, dias },
      "newsletter metagame: envio concluído",
    );

    return { assinantes: assinantes.length, enviados, falhas, secoes: secoes.length, dias };
  }
}
