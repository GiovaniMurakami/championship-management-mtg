import { DeckGateway } from "../../dominio/gateway/deckGateway";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { normalizarFormatoDeck } from "../../dominio/regras/formatoDeck";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import {
  agregarMetagame,
  ehDiasMetagame,
  MetagameAgregado,
} from "./agregarMetagame";

export type MetagameGateways = {
  torneio: TorneioGateway;
  inscricao: InscricaoGateway;
  partida: PartidaGateway;
  deck: DeckGateway;
  usuario: UsuarioGateway;
};

export function validarConsultaMetagame(formato: string, dias: number): { formato: string; dias: number } {
  const formatoNormalizado = normalizarFormatoDeck(formato || "");
  if (!formatoNormalizado) {
    throw ErroPersonalizado.criar({
      mensagem: "Formato é obrigatório.",
      status: StatusErro.erroParametro,
    });
  }
  if (!ehDiasMetagame(dias)) {
    throw ErroPersonalizado.criar({
      mensagem: "dias deve ser 7, 14, 30, 90 ou 365.",
      status: StatusErro.erroParametro,
    });
  }
  return { formato: formatoNormalizado, dias };
}

export async function carregarEAgregarMetagame(
  gateways: MetagameGateways,
  formato: string,
  dias: number
): Promise<MetagameAgregado> {
  const consulta = validarConsultaMetagame(formato, dias);
  const agora = new Date();
  const dataInicio = new Date(agora.getTime() - consulta.dias * 24 * 60 * 60 * 1000);

  const torneios = await gateways.torneio.listar({
    status: "finalizado",
    incluirSecretos: false,
    dataInicio,
  });

  const ids = torneios.map((t) => t.id);
  const [inscricoes, partidas] = ids.length
    ? await Promise.all([
        gateways.inscricao.listarPorTorneios(ids),
        gateways.partida.listarPorTorneios(ids),
      ])
    : [[], []];

  const deckIds = [...new Set([
    ...inscricoes.map((i) => i.deckId),
    ...partidas.flatMap((p) => [p.deckJogador1Id, p.deckJogador2Id]),
  ].filter((id): id is string => Boolean(id)))];
  const decks = deckIds.length ? await gateways.deck.buscarVarios(deckIds) : [];
  const usuarioIds = [...new Set(inscricoes.map((i) => i.usuarioId))];
  const usuarios = usuarioIds.length ? await gateways.usuario.buscarVarios(usuarioIds) : [];

  return agregarMetagame({
    formato: consulta.formato,
    dias: consulta.dias,
    agora,
    torneios,
    inscricoes,
    partidas,
    decks,
    usuarios,
  });
}
