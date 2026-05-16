import { z } from "zod";
import { getS3BaseUrl } from "../env";

function s3ImagemUrl() {
  return z
    .string()
    .url("URL inválida.")
    .refine(
      (url) => {
        const base = getS3BaseUrl();
        return base ? url.startsWith(base + "/") : true;
      },
      { message: "A URL da imagem deve pertencer ao bucket S3 autorizado." }
    );
}

const cartaSchema = z.object({
  nome: z.string().min(1),
  quantidade: z.number().int().min(1),
});

const commanderSchema = z.array(cartaSchema).nullable().optional();

export const cadastrarUsuarioSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório."),
  email: z.email("E-mail inválido."),
  senha: z.string().min(8, "A senha deve ter no mínimo 8 caracteres."),
});

export const loginUsuarioSchema = z.object({
  email: z.string().min(1, "E-mail é obrigatório."),
  senha: z.string().min(1, "Senha é obrigatória."),
});

export const atualizarUsuarioSchema = z.object({
  nome: z.string().min(1).optional(),
  telefone: z.string().optional(),
  nickMTGO: z.string().optional(),
  nickArena: z.string().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken é obrigatório."),
});

export const cadastrarDeckSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório."),
  formato: z.string().min(1, "Formato é obrigatório."),
  maindeck: z.array(cartaSchema).min(1, "Maindeck deve ter ao menos uma carta."),
  sideboard: z.array(cartaSchema).optional().default([]),
  commander: commanderSchema,
});

export const atualizarDeckSchema = z.object({
  nome: z.string().min(1).optional(),
  nomeConsolidado: z.string().optional().nullable(),
  formato: z.string().min(1).optional(),
  maindeck: z.array(cartaSchema).min(1).optional(),
  sideboard: z.array(cartaSchema).optional(),
  commander: commanderSchema,
});

export const criarTorneioSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório."),
  horario: z.string().min(1, "Horário é obrigatório."),
  formato: z.string().min(1, "Formato é obrigatório."),
  premio: z.string().optional(),
  bannerUrl: s3ImagemUrl().optional(),
  linkBanner: z.string().optional(),
  somRodada: z.string().optional(),
  maxJogadores: z.number().int().min(2).optional(),
  maxRodadas: z.number().int().min(1).optional(),
  corteTop: z.number().int().min(2).optional(),
  linkLive: z.string().optional(),
  secreto: z.boolean().optional(),
  exibirNomeJogador: z.enum(["nome", "nickMOL", "nickArena"]).optional(),
});

export const alterarTorneioSchema = z.object({
  nome: z.string().min(1).optional(),
  horario: z.string().optional(),
  formato: z.string().min(1).optional(),
  premio: z.string().optional(),
  bannerUrl: s3ImagemUrl().optional(),
  linkBanner: z.string().optional(),
  somRodada: z.string().optional(),
  maxJogadores: z.number().int().min(2).optional().nullable().transform(v => v ?? undefined),
  maxRodadas: z.number().int().min(1).optional().nullable().transform(v => v ?? undefined),
  corteTop: z.number().int().min(2).optional().nullable().transform(v => v ?? undefined),
  linkLive: z.string().optional(),
  secreto: z.boolean().optional(),
  exibirNomeJogador: z.enum(["nome", "nickMOL", "nickArena"]).optional(),
});

export const escolherDeckTorneioSchema = z.object({
  deckId: z.string().min(1, "deckId é obrigatório."),
  jogadorId: z.string().optional(),
});

export const registrarResultadoSchema = z.object({
  vitoriasJogador1: z.number().int().min(0, "vitoriasJogador1 deve ser inteiro >= 0."),
  vitoriasJogador2: z.number().int().min(0, "vitoriasJogador2 deve ser inteiro >= 0."),
});

export const droparJogadorSchema = z.object({
  jogadorId: z.string().optional(),
});

export const criarLigaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório."),
  descricao: z.string().optional(),
  torneioIds: z.array(z.string()).optional(),
  tipo: z.enum(["individual", "times"]).optional(),
});

export const alterarLigaSchema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional(),
  torneioIds: z.array(z.string()).optional(),
  tipo: z.enum(["individual", "times"]).optional(),
});

export const criarTimeSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório."),
  descricao: z.string().optional(),
  imagemUrl: z.string().url("imagemUrl deve ser uma URL válida.").optional(),
});

export const alterarTimeSchema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional(),
  imagemUrl: z.string().url("imagemUrl deve ser uma URL válida.").optional(),
});

export const gerarUrlUploadImagemSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/gif", "image/webp"], {
    error: "contentType deve ser image/jpeg, image/png, image/gif ou image/webp.",
  }),
  tamanhoBytes: z
    .number()
    .int()
    .min(1, "tamanhoBytes deve ser maior que 0.")
    .max(5 * 1024 * 1024, "tamanhoBytes não pode exceder 5 MB."),
});
