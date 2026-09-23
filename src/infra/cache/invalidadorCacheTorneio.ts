import { CacheDynamoDbServico } from "../services/cacheDynamoDbServico";
import { CACHE_PK_METAGAME } from "../../helpers/cache/chavesCache";
import { logger } from "../../helpers/logger";
import { eventosTorneio } from "../socketio/eventosTorneio";

const EVENTO_QUE_INVALIDA_METAGAME = "torneio_finalizado";

let iniciado = false;
let cacheAtivo: CacheDynamoDbServico | null = null;
const invalidacoesPendentes = new Set<Promise<void>>();

export function iniciarInvalidadorCacheTorneio(cache: CacheDynamoDbServico): void {
  cacheAtivo = cache;
  if (iniciado) return;
  iniciado = true;

  eventosTorneio.on(EVENTO_QUE_INVALIDA_METAGAME, (payload: { torneioId?: string }) => {
    if (!cacheAtivo) return;
    const promessa = invalidarCacheMetagame(cacheAtivo, payload?.torneioId);
    invalidacoesPendentes.add(promessa);
    promessa.finally(() => invalidacoesPendentes.delete(promessa));
  });
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
