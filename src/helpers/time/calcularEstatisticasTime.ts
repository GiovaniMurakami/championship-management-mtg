import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { Partida } from "../../dominio/entidade/partida";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";

export type EstatisticasCompetitivas = {
  partidas: number;
  vitorias: number;
  derrotas: number;
  empates: number;
  winRate: number;
};

const estatisticasVazias = (): EstatisticasCompetitivas => ({
  partidas: 0,
  vitorias: 0,
  derrotas: 0,
  empates: 0,
  winRate: 0,
});

function registrarResultado(estatisticas: EstatisticasCompetitivas, partida: Partida, usuarioId: string) {
  const jogador1 = partida.jogador1Id === usuarioId;
  const minhasVitorias = jogador1 ? partida.vitoriasJogador1 : partida.vitoriasJogador2;
  const vitoriasOponente = jogador1 ? partida.vitoriasJogador2 : partida.vitoriasJogador1;

  estatisticas.partidas += 1;
  if (minhasVitorias > vitoriasOponente) estatisticas.vitorias += 1;
  else if (minhasVitorias < vitoriasOponente) estatisticas.derrotas += 1;
  else estatisticas.empates += 1;
}

function finalizar(estatisticas: EstatisticasCompetitivas): EstatisticasCompetitivas {
  return {
    ...estatisticas,
    winRate: estatisticas.partidas > 0
      ? Number(((estatisticas.vitorias / estatisticas.partidas) * 100).toFixed(1))
      : 0,
  };
}

export async function calcularEstatisticasTime(
  membroIds: string[],
  inscricaoGateway: InscricaoGateway,
  partidaGateway: PartidaGateway,
) {
  const ids = Array.from(new Set(membroIds));
  const porMembro = new Map(ids.map((id) => [id, estatisticasVazias()]));
  if (ids.length === 0) return { time: estatisticasVazias(), porMembro };

  const inscricoes = (await Promise.all(ids.map((id) => inscricaoGateway.listarPorUsuario(id)))).flat();
  const torneioIds = Array.from(new Set(inscricoes.map((inscricao) => inscricao.torneioId)));
  const partidas = await partidaGateway.listarPorTorneios(torneioIds);
  const membros = new Set(ids);
  const estatisticasTime = estatisticasVazias();

  for (const partida of partidas) {
    if (partida.status !== "finalizada" || partida.jogador2Id === null) continue;

    const jogador1Membro = membros.has(partida.jogador1Id);
    const jogador2Membro = membros.has(partida.jogador2Id);
    if (!jogador1Membro && !jogador2Membro) continue;

    if (jogador1Membro) registrarResultado(porMembro.get(partida.jogador1Id)!, partida, partida.jogador1Id);
    if (jogador2Membro) registrarResultado(porMembro.get(partida.jogador2Id)!, partida, partida.jogador2Id);

    // Confrontos internos contam no histórico individual, mas não alteram o desempenho coletivo.
    if (jogador1Membro && jogador2Membro) continue;
    const membroId = jogador1Membro ? partida.jogador1Id : partida.jogador2Id;
    registrarResultado(estatisticasTime, partida, membroId);
  }

  return {
    time: finalizar(estatisticasTime),
    porMembro: new Map(Array.from(porMembro, ([id, stats]) => [id, finalizar(stats)])),
  };
}
