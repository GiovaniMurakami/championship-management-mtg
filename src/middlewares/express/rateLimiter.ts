import rateLimit, { type Options } from "express-rate-limit";
import { MongoRateLimitStore } from "../../infra/mongodb/rateLimitStore";
import { isExecucaoLocal } from "../../helpers/env";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MSG_TENTATIVAS = { mensagem: "Muitas tentativas. Tente novamente em 15 minutos." };
const MSG_REQUISICOES = { mensagem: "Muitas requisições. Tente novamente em 15 minutos." };

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
    ipv6Subnet: 56,
    message: MSG_TENTATIVAS,
  };

  if (usarStoreMongo()) {
    opcoes.store = new MongoRateLimitStore(WINDOW_MS, prefix);
  }

  return opcoes;
}

// Login, cadastro e reset de senha — mesmo bucket por IP (brute-force / spam de conta)
export const authRateLimiter = rateLimit({
  ...criarOpcoesRateLimit(5, "auth"),
  message: MSG_TENTATIVAS,
});

// Refresh de token — precisa aguentar retornos de idle + cold start sem matar a sessão
export const refreshTokenRateLimiter = rateLimit({
  ...criarOpcoesRateLimit(40, "refresh"),
  message: MSG_TENTATIVAS,
});

// Operações de conta autenticada — logout e atualizar perfil
export const accountRateLimiter = rateLimit(criarOpcoesRateLimit(15, "account"));

// Criar decks
export const deckRateLimiter = rateLimit(criarOpcoesRateLimit(40, "deck"));

// Inscrições / check-in / escolher deck — janela de torneio ao vivo precisa de folga
export const inscricaoRateLimiter = rateLimit(criarOpcoesRateLimit(400, "inscricao"));

// Registrar/confirmar/contestar resultado — muitas partidas por rodada
export const resultadoRateLimiter = rateLimit(criarOpcoesRateLimit(600, "resultado"));

// Mutações autenticadas genéricas — alterar/excluir deck, liga, time, etc.
export const mutationRateLimiter = rateLimit(criarOpcoesRateLimit(60, "mutation"));

// Mutações de torneio (rodada, pareamento, drop, mesa…) — bem mais brando que mutation genérica
export const torneioMutationRateLimiter = rateLimit(criarOpcoesRateLimit(500, "torneio-mutation"));

// Leitura pública barata — listagens e busca de deck/liga/time
export const publicReadRateLimiter = rateLimit({
  ...criarOpcoesRateLimit(100, "public-read"),
  message: MSG_REQUISICOES,
});

// Leitura de torneio (detalhe, standings, partidas, listar) — polling/realtime no app
export const torneioReadRateLimiter = rateLimit({
  ...criarOpcoesRateLimit(800, "torneio-read"),
  message: MSG_REQUISICOES,
});

// Agregações públicas caras — metagame e ranking de liga (varrem torneios/partidas)
export const heavyReadRateLimiter = rateLimit({
  ...criarOpcoesRateLimit(40, "heavy-read"),
  message: { mensagem: "Muitas consultas. Tente novamente em 15 minutos." },
});

// POST público (clique de anúncio) — sem JWT
export const publicActionRateLimiter = rateLimit({
  ...criarOpcoesRateLimit(30, "public-action"),
  message: MSG_REQUISICOES,
});

// Upload de imagem — restritivo para evitar abuso e custos S3
export const uploadImagemRateLimiter = rateLimit({
  ...criarOpcoesRateLimit(8, "upload"),
  message: { mensagem: "Limite de uploads atingido. Tente novamente em 15 minutos." },
});
