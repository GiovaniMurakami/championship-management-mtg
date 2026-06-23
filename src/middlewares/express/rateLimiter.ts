import rateLimit, { type Options } from "express-rate-limit";
import { MongoRateLimitStore } from "../../infra/mongodb/rateLimitStore";
import { isExecucaoLocal } from "../../helpers/env";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function usarStoreMongo(): boolean {
  const store = process.env.RATE_LIMIT_STORE?.trim().toLowerCase();
  if (store === "mongo") return true;
  if (store === "memory") return false;
  return !isExecucaoLocal();
}

function criarOpcoesRateLimit(max: number, prefix: string): Partial<Options> {
  const opcoes: Partial<Options> = {
    windowMs: WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { mensagem: "Muitas tentativas. Tente novamente em 15 minutos." },
  };

  if (usarStoreMongo()) {
    opcoes.store = new MongoRateLimitStore(WINDOW_MS, prefix);
  }

  return opcoes;
}

// Login e cadastro de conta — mais restritivo para dificultar brute-force
export const authRateLimiter = rateLimit({
  ...criarOpcoesRateLimit(5, "auth"),
  message: { mensagem: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// Refresh de token — um pouco mais permissivo que auth
export const refreshTokenRateLimiter = rateLimit({
  ...criarOpcoesRateLimit(15, "refresh"),
  message: { mensagem: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// Operações de conta autenticada — logout e atualizar perfil
export const accountRateLimiter = rateLimit(criarOpcoesRateLimit(20, "account"));

// Criar decks — limite brando pois chama ChatGPT mas não é rota crítica de segurança
export const deckRateLimiter = rateLimit(criarOpcoesRateLimit(60, "deck"));

// Inscrições em torneios — brando, jogadores se inscrevem/fazem check-in com frequência
export const inscricaoRateLimiter = rateLimit(criarOpcoesRateLimit(100, "inscricao"));

// Registrar resultado de partida — mais permissivo pois há muitas partidas por rodada
export const resultadoRateLimiter = rateLimit(criarOpcoesRateLimit(120, "resultado"));

// Mutações autenticadas genéricas — alterar/excluir deck, torneio, liga, etc.
export const mutationRateLimiter = rateLimit(criarOpcoesRateLimit(100, "mutation"));

// Leitura pública — endpoints de listagem/busca de torneio, deck e liga
export const publicReadRateLimiter = rateLimit({
  ...criarOpcoesRateLimit(200, "public-read"),
  message: { mensagem: "Muitas requisições. Tente novamente em 15 minutos." },
});

// Upload de imagem — restritivo para evitar abuso e custos S3
export const uploadImagemRateLimiter = rateLimit({
  ...criarOpcoesRateLimit(10, "upload"),
  message: { mensagem: "Limite de uploads atingido. Tente novamente em 15 minutos." },
});
