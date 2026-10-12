import { Partida } from "../../dominio/entidade/partida";
import { Torneio } from "../../dominio/entidade/torneio";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";

/**
 * Reconcilia as partidas da rodada e só então atualiza o torneio.
 * Uma rodada Swiss escreve mais itens do que o limite de 25 do TransactWrite,
 * então as duas etapas seguem em chamadas separadas, na mesma ordem de antes.
 */
export async function persistirTorneioComPartidas(
  torneioGateway: TorneioGateway,
  partidaGateway: PartidaGateway,
  torneio: Torneio,
  partidas: Partida[],
): Promise<void> {
  const porRodada = new Map<string, Partida[]>();
  for (const partida of partidas) {
    const chave = `${partida.torneioId}|${partida.rodada}`;
    const grupo = porRodada.get(chave) ?? [];
    grupo.push(partida);
    porRodada.set(chave, grupo);
  }

  for (const grupo of porRodada.values()) {
    const primeira = grupo[0];
    await partidaGateway.reconciliarRodada(primeira.torneioId, primeira.rodada, grupo);
  }

  await torneioGateway.atualizar(torneio);
}
