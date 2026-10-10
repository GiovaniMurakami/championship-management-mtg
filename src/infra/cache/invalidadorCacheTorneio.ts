import { CacheDynamoDbServico } from "../services/cacheDynamoDbServico";
import { CACHE_PK_METAGAME } from "../../helpers/cache/chavesCache";
import { logger } from "../../helpers/logger";
import { eventosTorneio } from "../socketio/eventosTorneio";

const EVENTOS_QUE_INVALIDAM_METAGAME = ["torneio_finalizado", "day1_encerrado"] as const;

let iniciado = false;
let cacheAtivo: CacheDynamoDbServico | null = null;
const invalidacoesPendentes = new Set<Promise<void>>();

export function iniciarInvalidadorCacheTorneio(cache: CacheDynamoDbServico): void {
  cacheAtivo = cache;
  if (iniciado) return;
  iniciado = true;

  for (const evento of EVENTOS_QUE_INVALIDAM_METAGAME) {
    eventosTorneio.on(evento, (payload: { torneioId?: string }) => {
      if (!cacheAtivo) return;
      const promessa = invalidarCacheMetagame(cacheAtivo, payload?.torneioId);
      invalidacoesPendentes.add(promessa);
      promessa.finally(() => invalidacoesPendentes.delete(promessa));
    });
  }
}

export async function aguardarInvalidacoesCachePendentes(): Promise<void> {
  if (invalidacoesPendentes.size === 0) return;
  await Promise.allSettled([...invalidacoesPendentes]);
}

async function invalidarCacheMetagame(
  cache: CacheDynamoDbServico,
  torneioId: string | undefined
): Promise<void> {
  if (!torneioId) return;

  try {
    await cache.invalidarParticao(CACHE_PK_METAGAME);
  } catch (error) {
    logger.warn({ err: error, torneioId }, "falha ao invalidar cache de metagame");
  }
}
