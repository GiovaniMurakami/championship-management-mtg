import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { toBrasiliaISO } from "../../helpers/data/brasilia";
import { normalizarFormatoDeck } from "../../dominio/regras/formatoDeck";
import { Deck } from "../../dominio/entidade/deck";
import { Inscricao } from "../../dominio/entidade/inscricao";
import {
  agregarMetagame,
  ArquetipoDetalhe,
  ArquetipoResumo,
  chaveNomeArquetipo,
  NOME_OUTROS,
} from "./agregarMetagame";
import { MetagameGateways } from "./carregarMetagame";

export type ConversaoDay2Arquetipo = {
  day1: number;
  day2: number;
  taxaConversao: number;
};

function slugPorDeckIdDoAgregado(
  porSlug: Map<string, ArquetipoDetalhe>,
): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const [slug, detalhe] of porSlug) {
    for (const resultado of detalhe.resultados ?? []) {
      if (resultado.deckId) mapa.set(resultado.deckId, slug);
    }
  }
  return mapa;
}

export type BuscarMetagameTorneioInputDto = {
  torneioId: string;
};

export type BuscarMetagameTorneioOutputDto = {
  torneio: {
    id: string;
    nome: string;
    formato: string;
    horario: string;
    status: string;
    corteTop?: number;
    rodadasDay1?: number;
    vagasDay2?: number;
    day1Encerrado: boolean;
    secreto: boolean;
  };
  totalDecks: number;
  conversaoDay2?: {
    jogadoresDay1: number;
    jogadoresDay2: number;
    taxaConversao: number;
    vagasDay2?: number;
  };
  arquetipos: (ArquetipoResumo &
    Pick<ArquetipoDetalhe, "matchups"> & {
      conversaoDay2?: ConversaoDay2Arquetipo;
    })[];
};

function nomeArquetipoDeck(deck: Deck | undefined): string {
  const consolidado = deck?.nomeConsolidado?.trim();
  if (consolidado) return consolidado;
  const nome = deck?.nome?.trim();
  return nome || NOME_OUTROS;
}

function passouParaDay2(inscricao: Inscricao, rodadasDay1: number): boolean {
  if (!inscricao.dropped) return true;
  return inscricao.droppedRodada != null && inscricao.droppedRodada > rodadasDay1;
}

export class BuscarMetagameTorneio
  implements CasoDeUso<BuscarMetagameTorneioInputDto, BuscarMetagameTorneioOutputDto>
{
  private constructor(private readonly gateways: MetagameGateways) {}

  public static criar(
    torneio: MetagameGateways["torneio"],
    inscricao: MetagameGateways["inscricao"],
    partida: MetagameGateways["partida"],
    deck: MetagameGateways["deck"],
    usuario: MetagameGateways["usuario"],
    siteConfig?: MetagameGateways["siteConfig"]
  ) {
    return new BuscarMetagameTorneio({ torneio, inscricao, partida, deck, usuario, siteConfig });
  }

  public async executar(input: BuscarMetagameTorneioInputDto): Promise<BuscarMetagameTorneioOutputDto> {
    const torneio = await this.gateways.torneio.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    const day1Liberado = torneio.day1Encerrado === true;
    if (torneio.status !== "finalizado" && !day1Liberado) {
      throw ErroPersonalizado.criar({
        mensagem: "Metagame breakdown disponível após o Day 1 encerrado ou com o torneio finalizado.",
        status: StatusErro.erroParametro,
      });
    }

    const formato = normalizarFormatoDeck(torneio.formato);
    if (!formato) {
      throw ErroPersonalizado.criar({
        mensagem: "Formato do torneio inválido.",
        status: StatusErro.erroParametro,
      });
    }

    const [inscricoes, partidasBrutas, overridesConfig] = await Promise.all([
      this.gateways.inscricao.listarPorTorneio(torneio.id),
      this.gateways.partida.listarPorTorneio(torneio.id),
      this.gateways.siteConfig?.buscarMetagameOverrides() ?? Promise.resolve(null),
    ]);

    const soDay1 =
      day1Liberado &&
      torneio.status !== "finalizado" &&
      Number(torneio.rodadasDay1 || 0) > 0;
    const partidas = soDay1
      ? partidasBrutas.filter((p) => p.rodada <= torneio.rodadasDay1!)
      : partidasBrutas;

    const deckIds = [...new Set([
      ...inscricoes.map((i) => i.deckId),
      ...partidas.flatMap((p) => [p.deckJogador1Id, p.deckJogador2Id]),
    ].filter((id): id is string => Boolean(id)))];

    const decks = deckIds.length ? await this.gateways.deck.buscarVarios(deckIds) : [];
    const usuarioIds = [...new Set(inscricoes.map((i) => i.usuarioId))];
    const usuarios = usuarioIds.length ? await this.gateways.usuario.buscarVarios(usuarioIds) : [];
    const decksPorId = new Map(decks.map((d) => [d.id, d]));

    const agregado = agregarMetagame({
      formato,
      dias: 1,
      agora: new Date(),
      intervalo: { dataInicio: torneio.horario, dataFim: torneio.horario },
      torneios: [torneio],
      inscricoes,
      partidas,
      decks,
      usuarios,
      overridesCartasRepresentativas: overridesConfig?.cartasRepresentativas,
      permitirSecretos: true,
      permitirNaoFinalizados: torneio.status !== "finalizado",
    });

    let conversaoDay2: BuscarMetagameTorneioOutputDto["conversaoDay2"];
    const conversaoPorSlug = new Map<string, ConversaoDay2Arquetipo>();

    if (day1Liberado && Number(torneio.rodadasDay1 || 0) > 0) {
      const rodadasDay1 = torneio.rodadasDay1!;
      const comDeck = inscricoes.filter((i) => i.deckId && decksPorId.has(i.deckId));
      const day2 = comDeck.filter((i) => passouParaDay2(i, rodadasDay1));
      const jogadoresDay1 = comDeck.length;
      const jogadoresDay2 = day2.length;
      conversaoDay2 = {
        jogadoresDay1,
        jogadoresDay2,
        taxaConversao: jogadoresDay1 > 0 ? jogadoresDay2 / jogadoresDay1 : 0,
        vagasDay2: torneio.vagasDay2,
      };

      // Mesmo agrupamento do agregarMetagame: deckId → slug do arquétipo.
      const slugPorDeckId = slugPorDeckIdDoAgregado(agregado.porSlug);
      const slugPorChaveNome = new Map(
        agregado.arquetipos.map((a) => [chaveNomeArquetipo(a.nome), a.slug] as const),
      );
      const day1PorSlug = new Map<string, number>();
      const day2PorSlug = new Map<string, number>();
      for (const inscricao of comDeck) {
        let slug = slugPorDeckId.get(inscricao.deckId!);
        if (!slug) {
          const chave = chaveNomeArquetipo(nomeArquetipoDeck(decksPorId.get(inscricao.deckId!)));
          slug = slugPorChaveNome.get(chave);
        }
        if (!slug) continue;
        day1PorSlug.set(slug, (day1PorSlug.get(slug) ?? 0) + 1);
        if (passouParaDay2(inscricao, rodadasDay1)) {
          day2PorSlug.set(slug, (day2PorSlug.get(slug) ?? 0) + 1);
        }
      }
      for (const arquetipo of agregado.arquetipos) {
        const day1 = day1PorSlug.get(arquetipo.slug) ?? 0;
        if (day1 <= 0) continue;
        const d2 = day2PorSlug.get(arquetipo.slug) ?? 0;
        conversaoPorSlug.set(arquetipo.slug, {
          day1,
          day2: d2,
          taxaConversao: d2 / day1,
        });
      }
    }

    return {
      torneio: {
        id: torneio.id,
        nome: torneio.nome,
        formato: torneio.formato,
        horario: toBrasiliaISO(torneio.horario)!,
        status: torneio.status,
        corteTop: torneio.corteTop,
        rodadasDay1: torneio.rodadasDay1,
        vagasDay2: torneio.vagasDay2,
        day1Encerrado: torneio.day1Encerrado,
        secreto: torneio.secreto,
      },
      totalDecks: agregado.totalDecks,
      conversaoDay2,
      arquetipos: agregado.arquetipos.map((arquetipo) => ({
        ...arquetipo,
        matchups: agregado.porSlug.get(arquetipo.slug)?.matchups ?? [],
        conversaoDay2: conversaoPorSlug.get(arquetipo.slug),
      })),
    };
  }
}
