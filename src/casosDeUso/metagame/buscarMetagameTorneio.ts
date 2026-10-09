import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { toBrasiliaISO } from "../../helpers/data/brasilia";
import { normalizarFormatoDeck } from "../../dominio/regras/formatoDeck";
import { agregarMetagame, ArquetipoDetalhe, ArquetipoResumo } from "./agregarMetagame";
import { MetagameGateways } from "./carregarMetagame";

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
    secreto: boolean;
  };
  totalDecks: number;
  arquetipos: (ArquetipoResumo & Pick<ArquetipoDetalhe, "matchups">)[];
};

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

    if (torneio.status !== "finalizado") {
      throw ErroPersonalizado.criar({
        mensagem: "Metagame breakdown disponível apenas para torneios finalizados.",
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

    const [inscricoes, partidas, overridesConfig] = await Promise.all([
      this.gateways.inscricao.listarPorTorneio(torneio.id),
      this.gateways.partida.listarPorTorneio(torneio.id),
      this.gateways.siteConfig?.buscarMetagameOverrides() ?? Promise.resolve(null),
    ]);

    const deckIds = [...new Set([
      ...inscricoes.map((i) => i.deckId),
      ...partidas.flatMap((p) => [p.deckJogador1Id, p.deckJogador2Id]),
    ].filter((id): id is string => Boolean(id)))];

    const decks = deckIds.length ? await this.gateways.deck.buscarVarios(deckIds) : [];
    const usuarioIds = [...new Set(inscricoes.map((i) => i.usuarioId))];
    const usuarios = usuarioIds.length ? await this.gateways.usuario.buscarVarios(usuarioIds) : [];

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
    });

    return {
      torneio: {
        id: torneio.id,
        nome: torneio.nome,
        formato: torneio.formato,
        horario: toBrasiliaISO(torneio.horario)!,
        status: torneio.status,
        corteTop: torneio.corteTop,
        secreto: torneio.secreto,
      },
      totalDecks: agregado.totalDecks,
      arquetipos: agregado.arquetipos.map((arquetipo) => ({
        ...arquetipo,
        matchups: agregado.porSlug.get(arquetipo.slug)?.matchups ?? [],
      })),
    };
  }
}
