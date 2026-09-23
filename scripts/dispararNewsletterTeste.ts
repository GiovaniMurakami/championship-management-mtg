import "dotenv/config";
import { criarRepositorios } from "../src/composicao/repositorios";
import { criarServicos } from "../src/composicao/servicos";
import { ListarMetagame } from "../src/casosDeUso/metagame/listarMetagame";
import { EnviarNewsletterMetagameSemanal } from "../src/casosDeUso/site/enviarNewsletterMetagameSemanal";
import { criarEmailNewsletterMetagame } from "../src/infra/services/templatesEmail";
import { getFrontendUrl } from "../src/helpers/env";

function arg(nome: string): string | undefined {
  const prefix = `--${nome}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : undefined;
}

async function main() {
  const para = arg("para");
  const repos = criarRepositorios();
  const servicos = criarServicos();
  const listarMetagame = ListarMetagame.criar(
    repos.torneio,
    repos.inscricao,
    repos.partida,
    repos.deck,
    repos.usuario,
    servicos.cache,
  );

  if (para) {
    const baseUrl = getFrontendUrl().replace(/\/$/, "");
    const formatos = [
      { formato: "pauper", label: "Pauper" },
      { formato: "standard", label: "Standard" },
      { formato: "modern", label: "Modern" },
      { formato: "pioneer", label: "Pioneer" },
      { formato: "commander", label: "Commander" },
      { formato: "commander500", label: "Commander 500" },
    ];
    const dias = Number(arg("dias") || 30);
    const secoes = [];

    for (const { formato, label } of formatos) {
      const metagame = await listarMetagame.executar({ formato, dias, limite: 5 });
      if (!metagame.totalDecks && !metagame.totalTorneios) continue;
      secoes.push({
        formato,
        label,
        totalTorneios: metagame.totalTorneios,
        totalDecks: metagame.totalDecks,
        link: `${baseUrl}/metagame?formato=${encodeURIComponent(formato)}&dias=${dias}`,
        arquetipos: (metagame.arquetipos ?? []).slice(0, 5).map((a) => ({
          nome: a.nome || a.slug || "Arquétipo",
          metaPercentual: a.metaPct ?? 0,
          winrate: a.winrate,
          totalDecks: a.copias,
        })),
      });
    }

    const email = criarEmailNewsletterMetagame({
      nome: "Teste",
      secoes,
      linkPreferencias: `${baseUrl}/?newsletter=preferencias`,
      linkDescadastro: `${baseUrl}/newsletter/descadastrar?token=TOKEN_DE_TESTE`,
    });

    await servicos.email.enviar({
      para,
      assunto: `[TESTE] Metagame da semana — Fuguete (${dias}d)`,
      html: email.html,
      texto: email.texto,
    });

    console.log(JSON.stringify({
      modo: "preview",
      para,
      dias,
      secoes: secoes.map((s) => ({
        formato: s.formato,
        torneios: s.totalTorneios,
        decks: s.totalDecks,
        top: s.arquetipos.length,
      })),
    }, null, 2));
    return;
  }

  const diasArg = arg("dias");
  const dias = diasArg ? Number(diasArg) : undefined;
  const caso = EnviarNewsletterMetagameSemanal.criar(repos.usuario, listarMetagame, servicos.email);
  const resultado = await caso.executar({
    dias: Number.isFinite(dias) && (dias as number) > 0 ? dias : 7,
    assuntoPrefixo: dias && Number(dias) !== 7 ? `[TESTE ${dias}d]` : undefined,
  });
  console.log(JSON.stringify({ modo: "assinantes", ...resultado }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
