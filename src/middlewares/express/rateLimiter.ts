import rateLimit from "express-rate-limit";

// MemoryStore (padrão do express-rate-limit): sub-milissegundo, sem I/O de rede.
// Em Lambda cada instância conta independentemente — aceitável para proteção
// básica sem o overhead de uma escrita MongoDB por request.

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

// Login e cadastro de conta — mais restritivo para dificultar brute-force
export const authRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensagem: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// Refresh de token — um pouco mais permissivo que auth
export const refreshTokenRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensagem: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// Operações de conta autenticada — logout e atualizar perfil
export const accountRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensagem: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// Criar decks — limite brando pois chama ChatGPT mas não é rota crítica de segurança
export const deckRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensagem: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// Inscrições em torneios — brando, jogadores se inscrevem/fazem check-in com frequência
export const inscricaoRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensagem: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// Registrar resultado de partida — mais permissivo pois há muitas partidas por rodada
export const resultadoRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensagem: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// Mutações autenticadas genéricas — alterar/excluir deck, torneio, liga, etc. (não críticas)
export const mutationRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensagem: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// Leitura pública — endpoints de listagem/busca de torneio, deck e liga
export const publicReadRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensagem: "Muitas requisições. Tente novamente em 15 minutos." },
});

// Upload de imagem — restritivo para evitar abuso e custos S3
export const uploadImagemRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensagem: "Limite de uploads atingido. Tente novamente em 15 minutos." },
});
