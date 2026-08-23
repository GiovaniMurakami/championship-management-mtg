import { CacheDynamoDbServico } from "../services/cacheDynamoDbServico";
import {
  CACHE_PK_LIGAS,
  CACHE_PK_METAGAME,
  CACHE_PK_TORNEIOS,
  cachePkTorneio,
} from "../../helpers/cache/chavesCache";
import { logger } from "../../helpers/logger";
import { eventosTorneio } from "../socketio/eventosTorneio";

const EVENTOS_QUE_INVALIDAM_CACHE = [
  "torneio_criado",
  "torneio_alterado",
  "torneio_excluido",
  "participante_inscrito",
  "checkin_realizado",
  "deck_inserido",
  "torneio_iniciado",
  "rodada_iniciada",
  "torneio_finalizado",
  "resultado_registrado",
  "resultado_confirmado",
  "resultado_contestado",
  "resultado_ajustado",
  "mesa_atualizada",
  "pareamentos_atualizados",
  "rodada_refeita",
  "jogador_dropou",
  "jogador_voltou",
  "jogador_ingressou",
  "total_rodadas_alterado",
];

let iniciado = false;
let cacheAtivo: CacheDynamoDbServico | null = null;
const invalidacoesPendentes = new Set<Promise<void>>();

export function iniciarInvalidadorCacheTorneio(cache: CacheDynamoDbServico): void {
  cacheAtivo = cache;
  if (iniciado) return;
  iniciado = true;

  for (const evento of EVENTOS_QUE_INVALIDAM_CACHE) {
    eventosTorneio.on(evento, (payload: { torneioId?: string }) => {
      if (!cacheAtivo) return;
      const promessa = invalidarCacheTorneio(cacheAtivo, payload?.torneioId, evento);
      invalidacoesPendentes.add(promessa);
      promessa.finally(() => invalidacoesPendentes.delete(promessa));
    });
  }
}

export async function aguardarInvalidacoesCachePendentes(): Promise<void> {
  if (invalidacoesPendentes.size === 0) return;
  await Promise.allSettled([...invalidacoesPendentes]);
}

async function invalidarCacheTorneio(
  cache: CacheDynamoDbServico,
  torneioId: string | undefined,
  evento: string
): Promise<void> {
  if (!torneioId) return;

  try {
    await Promise.all([
      cache.invalidarParticao(cachePkTorneio(torneioId)),
      cache.invalidarParticao(CACHE_PK_METAGAME),
      cache.invalidarParticao(CACHE_PK_TORNEIOS),
      cache.invalidarParticao(CACHE_PK_LIGAS),
    ]);
  } catch (error) {
    logger.warn({ err: error, torneioId, evento }, "falha ao invalidar cache de torneio");
  }
}
