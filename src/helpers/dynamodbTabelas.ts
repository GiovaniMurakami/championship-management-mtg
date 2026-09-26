import { logger } from "./logger";

const ESTAGIOS = ["local", "dev", "prod", "test"] as const;
type EstagioTabela = (typeof ESTAGIOS)[number];

/** Extrai o estágio (local|dev|prod|test) de nomes `…-{stage}-data|cache`. */
export function extrairEstagioTabelaDynamo(nome: string): EstagioTabela | null {
  const match = String(nome || "").trim().match(/-(local|dev|prod|test)-(?:data|cache)$/i);
  const estagio = match?.[1]?.toLowerCase();
  return ESTAGIOS.find((item) => item === estagio) ?? null;
}

/** Deriva `…-cache` a partir de `…-data`. */
export function derivarTabelaCacheDaData(tabelaData: string): string {
  const nome = String(tabelaData || "").trim();
  if (!nome.toLowerCase().endsWith("-data")) return "";
  return `${nome.slice(0, -5)}-cache`;
}

/**
 * Resolve a tabela de cache alinhada ao ambiente da DATA.
 * Se CACHE e DATA tiverem stages diferentes (ex.: local-data + dev-cache),
 * usa o cache derivado da DATA para não misturar ambientes.
 */
export function resolverTabelaCacheDynamo(
  tabelaData = process.env.DYNAMODB_DATA_TABLE,
  tabelaCache = process.env.DYNAMODB_CACHE_TABLE,
): string {
  const data = String(tabelaData || "").trim();
  const cache = String(tabelaCache || "").trim();
  const derivada = derivarTabelaCacheDaData(data);

  if (derivada && cache) {
    const estagioData = extrairEstagioTabelaDynamo(data);
    const estagioCache = extrairEstagioTabelaDynamo(cache);
    if (estagioData && estagioCache && estagioData !== estagioCache) {
      logger.warn(
        { data, cache, usando: derivada },
        "DYNAMODB_CACHE_TABLE em stage diferente da DATA; alinhando cache à DATA",
      );
      return derivada;
    }
  }

  return cache || derivada || "";
}
