import rateLimit from "express-rate-limit";

// Login e cadastro de conta — mais restritivo para dificultar brute-force
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensagem: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// Refresh de token — um pouco mais permissivo que auth
export const refreshTokenRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensagem: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// Operações de conta autenticada — logout e atualizar perfil
export const accountRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensagem: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// Criar decks — evitar spam de decks no banco
export const deckRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensagem: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// Inscrições em torneios — por ser ação pontual, limite moderado
export const inscricaoRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensagem: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// Registrar resultado de partida — mais permissivo pois há muitas partidas por rodada
export const resultadoRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensagem: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// Mutações autenticadas genéricas — alterar/excluir deck, torneio, liga, etc.
export const mutationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensagem: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// Leitura pública — endpoints sem auth (ex: buscar/listar decks)
export const publicReadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensagem: "Muitas requisições. Tente novamente em 15 minutos." },
});
