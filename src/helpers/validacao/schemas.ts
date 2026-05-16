import { z } from "zod";
import { getS3BaseUrl } from "../env";

function s3ImagemUrl() {
  return z
    .string()
    .url("URL invÃ¡lida.")
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
const linkLigaMagicSchema = z.string().url("linkLigaMagic deve ser uma URL válida.").nullable().optional();
const ehFormatoCommander500 = (formato: string) => formato.toLowerCase().trim().replace(/\s+/g, "") === "commander500";

export const cadastrarUsuarioSchema = z.object({
  nome: z.string().min(1, "Nome Ã© obrigatÃ³rio."),
  email: z.email("E-mail invÃ¡lido."),
  senha: z.string().min(8, "A senha deve ter no mÃ­nimo 8 caracteres."),
});

export const loginUsuarioSchema = z.object({
  email: z.string().min(1, "E-mail Ã© obrigatÃ³rio."),
  senha: z.string().min(1, "Senha Ã© obrigatÃ³ria."),
});

export const atualizarUsuarioSchema = z.object({
  nome: z.string().min(1).optional(),
  telefone: z.string().optional(),
  nickMTGO: z.string().optional(),
  nickArena: z.string().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken Ã© obrigatÃ³rio."),
});

export const cadastrarDeckSchema = z.object({
  nome: z.string().min(1, "Nome Ã© obrigatÃ³rio."),
  formato: z.string().min(1, "Formato Ã© obrigatÃ³rio."),
  linkLigaMagic: linkLigaMagicSchema,
  maindeck: z.array(cartaSchema).min(1, "Maindeck deve ter ao menos uma carta."),
  sideboard: z.array(cartaSchema).optional().default([]),
  commander: commanderSchema,
}).superRefine((dados, ctx) => {
  if (ehFormatoCommander500(dados.formato) && !dados.linkLigaMagic) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["linkLigaMagic"],
      message: "linkLigaMagic Ã© obrigatÃ³rio quando formato for commander500.",
    });
  }
});

export const atualizarDeckSchema = z.object({
  nome: z.string().min(1).optional(),
  nomeConsolidado: z.string().optional().nullable(),
  formato: z.string().min(1).optional(),
  linkLigaMagic: linkLigaMagicSchema,
  maindeck: z.array(cartaSchema).min(1).optional(),
  sideboard: z.array(cartaSchema).optional(),
  commander: commanderSchema,
});

export const criarTorneioSchema = z.object({
  nome: z.string().min(1, "Nome Ã© obrigatÃ³rio."),
  horario: z.string().min(1, "HorÃ¡rio Ã© obrigatÃ³rio."),
  formato: z.string().min(1, "Formato Ã© obrigatÃ³rio."),
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
  deckId: z.string().min(1, "deckId Ã© obrigatÃ³rio."),
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
  nome: z.string().min(1, "Nome Ã© obrigatÃ³rio."),
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
  nome: z.string().min(1, "Nome Ã© obrigatÃ³rio."),
  descricao: z.string().optional(),
  imagemUrl: z.string().url("imagemUrl deve ser uma URL vÃ¡lida.").optional(),
});

export const alterarTimeSchema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional(),
  imagemUrl: z.string().url("imagemUrl deve ser uma URL vÃ¡lida.").optional(),
});

export const gerarUrlUploadImagemSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/gif", "image/webp"], {
    error: "contentType deve ser image/jpeg, image/png, image/gif ou image/webp.",
  }),
  tamanhoBytes: z
    .number()
    .int()
    .min(1, "tamanhoBytes deve ser maior que 0.")
    .max(5 * 1024 * 1024, "tamanhoBytes nÃ£o pode exceder 5 MB."),
});
