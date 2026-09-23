import { Partida } from "../../dominio/entidade/partida";
import { Torneio } from "../../dominio/entidade/torneio";
import { ErroPersonalizado } from "../error/ErroPersonalizado";
import { StatusErro } from "../error/statusErro";

export function rodadaEstaPublicada(torneio: Pick<Torneio, "rodadaPublicada">): boolean {
  return torneio.rodadaPublicada !== false;
}

export function aplicarPublicacaoRodada(torneio: Torneio, publicar: boolean): void {
  if (publicar) {
    torneio.rodadaPublicada = true;
    return;
  }
  torneio.rodadaPublicada = false;
  torneio.rodadaIniciadaEm = undefined;
}

export function rejeitarResultadoSeRodadaNaoPublicada(
  torneio: Pick<Torneio, "rodadaAtual" | "rodadaPublicada">,
  partida: Pick<Partida, "rodada">,
): void {
  if (assertRodadaPublicadaParaResultado(torneio, partida)) return;
  throw ErroPersonalizado.criar({
    mensagem: "A rodada ainda não foi publicada. Aguarde o organizador liberar as mesas.",
    status: StatusErro.erroParametro,
  });
}

export function filtrarPartidasNaoPublicadas<T extends { rodada: number }>(
  partidas: T[],
  torneio: Pick<Torneio, "rodadaAtual" | "rodadaPublicada">,
  podeVerRascunho: boolean,
): T[] {
  if (podeVerRascunho || rodadaEstaPublicada(torneio)) return partidas;
  return partidas.filter((partida) => partida.rodada !== torneio.rodadaAtual);
}

export function assertRodadaPublicadaParaResultado(
  torneio: Pick<Torneio, "rodadaAtual" | "rodadaPublicada">,
  partida: Pick<Partida, "rodada">,
): boolean {
  if (rodadaEstaPublicada(torneio)) return true;
  return partida.rodada !== torneio.rodadaAtual;
}
