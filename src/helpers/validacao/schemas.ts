import { z } from "zod";
import { getS3BaseUrl } from "../env";
import { paginacaoQueryCampos, uuidCampo } from "./campos";

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

function s3ImagemUrlOuVazio() {
  return z.union([s3ImagemUrl(), z.literal("")]);
}

export const cadastrarStoryFundoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório.").max(100, "Nome pode ter no máximo 100 caracteres."),
  url: s3ImagemUrl(),
  textoRodape: z.enum(["claro", "escuro"]).optional().default("claro"),
});

/** Query de GET /imagem/proxy — só URLs do bucket S3 configurado (anti-SSRF). */
export const proxyImagemQuerySchema = z.object({
  url: s3ImagemUrl(),
});

const cartaSchema = z.object({
  nome: z.string().min(1),
  quantidade: z.number().int().min(1),
});

const commanderSchema = z.array(cartaSchema).nullable().optional();
const linkLigaMagicSchema = z.string().url("linkLigaMagic deve ser uma URL válida.").nullable().optional();
const ehFormatoCommander500 = (formato: string) => formato.toLowerCase().trim().replace(/\s+/g, "") === "commander500";

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
  fotoUrl: z.string().url("fotoUrl deve ser uma URL válida.").max(2048).optional(),
});

export const excluirContaSchema = z.object({
  confirmacao: z.string().min(1, "Confirmação é obrigatória."),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken é obrigatório."),
});

export const cadastrarDeckSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório."),
  formato: z.string().min(1, "Formato é obrigatório."),
  linkLigaMagic: linkLigaMagicSchema,
  maindeck: z.array(cartaSchema).min(1, "Maindeck deve ter ao menos uma carta."),
  sideboard: z.array(cartaSchema).optional().default([]),
  commander: commanderSchema,
}).superRefine((dados, ctx) => {
  if (ehFormatoCommander500(dados.formato) && !dados.linkLigaMagic) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["linkLigaMagic"],
      message: "linkLigaMagic é obrigatório quando formato for commander500.",
    });
  }
});

export const atualizarDeckSchema = z.object({
  nome: z.string().min(1).optional(),
  nomeConsolidado: z.string().optional().nullable(),
  cartaRepresentativa: z.string().max(200).optional().nullable(),
  formato: z.string().min(1).optional(),
  linkLigaMagic: linkLigaMagicSchema,
  maindeck: z.array(cartaSchema).min(1).optional(),
  sideboard: z.array(cartaSchema).optional(),
  commander: commanderSchema,
});

export const criarTorneioSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório."),
  horario: z.string().min(1, "Horário é obrigatório."),
  formato: z.string().min(1, "Formato é obrigatório."),
  descricao: z.string().max(4000, "A descrição pode ter no máximo 4000 caracteres.").optional(),
  regras: z.string().max(4000, "As regras do torneio podem ter no máximo 4000 caracteres.").optional(),
  bannerUrl: s3ImagemUrlOuVazio().optional(),
  linkBanner: z.string().optional(),
  somRodada: z.string().optional(),
  storyFundoUrl: s3ImagemUrlOuVazio().optional(),
  storyFundoTextoRodape: z.enum(["claro", "escuro"]).optional(),
  maxJogadores: z.number().int().min(2).optional(),
  maxRodadas: z.number().int().min(1).max(30).optional(),
  corteTop: z.number().int().min(2).optional(),
  linkLive: z.string().optional(),
  secreto: z.boolean().optional(),
  exibirNomeJogador: z.enum(["nome", "nickMOL", "nickArena"]).optional(),
});

export const alterarTorneioSchema = z.object({
  nome: z.string().min(1).optional(),
  horario: z.string().optional(),
  formato: z.string().min(1).optional(),
  descricao: z.string().max(4000, "A descrição pode ter no máximo 4000 caracteres.").optional(),
  regras: z.string().max(4000, "As regras do torneio podem ter no máximo 4000 caracteres.").optional(),
  bannerUrl: s3ImagemUrlOuVazio().optional(),
  linkBanner: z.string().optional(),
  somRodada: z.string().optional(),
  storyFundoUrl: s3ImagemUrlOuVazio().optional(),
  storyFundoTextoRodape: z.enum(["claro", "escuro"]).optional(),
  maxJogadores: z.number().int().min(2).optional().nullable().transform(v => v ?? undefined),
  maxRodadas: z.number().int().min(1).max(30).optional().nullable().transform(v => v ?? undefined),
  corteTop: z.number().int().min(2).optional().nullable().transform(v => v ?? undefined),
  linkLive: z.string().optional(),
  secreto: z.boolean().optional(),
  exibirNomeJogador: z.enum(["nome", "nickMOL", "nickArena"]).optional(),
});

export const escolherDeckTorneioSchema = z.object({
  deckId: uuidCampo("deckId"),
  jogadorId: uuidCampo("jogadorId").optional(),
});

export const atualizarPareamentosRodadaSchema = z.object({
  partidas: z.array(z.object({
    id: uuidCampo("id").optional().nullable(),
    jogador1Id: uuidCampo("jogador1Id"),
    jogador2Id: uuidCampo("jogador2Id").nullable().optional(),
    mesa: z.number().int().min(1, "mesa deve ser inteiro >= 1.").nullable().optional(),
  })).min(1, "Informe ao menos uma partida para atualizar."),
});

export const registrarResultadoSchema = z.object({
  vitoriasJogador1: z.number().int().min(0, "vitoriasJogador1 deve ser inteiro >= 0."),
  vitoriasJogador2: z.number().int().min(0, "vitoriasJogador2 deve ser inteiro >= 0."),
});

export const contestarResultadoSchema = z.object({
  observacao: z
    .string()
    .trim()
    .max(500, "Observação deve ter no máximo 500 caracteres.")
    .optional(),
});

export const ajustarTotalRodadasSchema = z.object({
  totalRodadas: z.number().int().min(1, "totalRodadas deve ser >= 1.").max(30, "totalRodadas deve ser <= 30."),
});

export const droparJogadorSchema = z.object({
  jogadorId: uuidCampo("jogadorId").optional(),
});

export const desdroparJogadorSchema = z.object({
  jogadorId: uuidCampo("jogadorId").optional(),
});

export const criarLigaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório."),
  descricao: z.string().optional(),
  bannerUrl: s3ImagemUrlOuVazio().optional(),
  torneioIds: z.array(uuidCampo("torneioId")).optional(),
  tipo: z.enum(["individual", "times"]).optional(),
});

export const alterarLigaSchema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional(),
  bannerUrl: s3ImagemUrlOuVazio().optional(),
  torneioIds: z.array(uuidCampo("torneioId")).optional(),
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

export const criarPostSchema = z.object({
  legenda: z.string().trim().max(2200, "A legenda pode ter no máximo 2200 caracteres.").optional(),
  imagens: z.array(s3ImagemUrl()).min(1, "Informe ao menos uma imagem."),
});

export const editarPostSchema = criarPostSchema;

export const comentarPostSchema = z.object({
  texto: z.string().trim().min(1, "Comentário é obrigatório.").max(1000, "O comentário pode ter no máximo 1000 caracteres."),
});

export const listarPostsQuerySchema = z.object({
  limite: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const solicitarResetSenhaSchema = z.object({
  email: z.email("E-mail inválido."),
});

export const confirmarResetSenhaSchema = z.object({
  token: z.string().min(1, "Token é obrigatório."),
  novaSenha: z.string().min(8, "A senha deve ter no mínimo 8 caracteres."),
});

// --- Params ---

export const idParamSchema = z.object({ id: uuidCampo("id") });
export const postIdParamSchema = z.object({ postId: uuidCampo("postId") });
export const torneioIdParamSchema = z.object({ torneioId: uuidCampo("torneioId") });
export const partidaIdParamSchema = z.object({ partidaId: uuidCampo("partidaId") });
export const anuncioIdParamSchema = z.object({ anuncioId: uuidCampo("anuncioId") });
export const tokenIngressoParamSchema = z.object({ token: uuidCampo("token") });
export const timeIdUsuarioIdParamSchema = z.object({
  id: uuidCampo("id"),
  usuarioId: uuidCampo("usuarioId"),
});
export const torneioRodadaParamSchema = z.object({
  torneioId: uuidCampo("torneioId"),
  rodada: z.coerce.number().int().min(1, "rodada deve ser inteiro >= 1."),
});

// --- Query ---

export const listarUsuariosQuerySchema = z.object({
  nome: z.string().max(200).optional(),
  jogador: z.string().max(200).optional(),
  bloqueadoTorneios: z
    .enum(["true", "false"])
    .optional()
    .transform((valor) => (valor === undefined ? undefined : valor === "true")),
  ...paginacaoQueryCampos,
});

export const alterarBloqueioTorneiosSchema = z.object({
  bloqueado: z.boolean(),
});

export const usuarioIdParamSchema = z.object({
  usuarioId: uuidCampo("usuarioId"),
});

export const definirAnfitriaoTorneioSchema = z.object({
  anfitriaoId: uuidCampo("anfitriaoId").nullable(),
});

export const listarDecksQuerySchema = z.object({
  usuarioId: uuidCampo("usuarioId").optional(),
  formato: z.string().max(100).optional(),
  nome: z.string().max(200).optional(),
  jogador: z.string().max(200).optional(),
  criadoApos: z.string().optional(),
  criadoAntes: z.string().optional(),
  ...paginacaoQueryCampos,
});

const dataQueryCampo = z.string().optional();

export const listarTorneiosQuerySchema = z.object({
  status: z.enum(["inscricoes_abertas", "em_andamento", "finalizado"]).optional(),
  nome: z.string().max(200).optional(),
  dataInicio: dataQueryCampo,
  dataFim: dataQueryCampo,
  ...paginacaoQueryCampos,
});

export const listarPartidasQuerySchema = z.object({
  rodada: z.coerce.number().int().min(1).optional(),
});

export const listarLigasQuerySchema = z.object({
  nome: z.string().max(200).optional(),
  tipo: z.enum(["individual", "times"]).optional(),
  ...paginacaoQueryCampos,
});

export const listarTimesQuerySchema = z.object({
  nome: z.string().max(200).optional(),
  membroId: uuidCampo("membroId").optional(),
  ...paginacaoQueryCampos,
});

const limiteRankingCampo = z.coerce.number().int().min(1).max(200).optional();

export const rankingLigaQuerySchema = z.object({
  limiteJogadores: limiteRankingCampo,
  limiteTimes: limiteRankingCampo.default(50),
  limiteDecks: limiteRankingCampo.default(50),
  limiteCartas: limiteRankingCampo.default(50),
});

// --- Body adicional ---

export const inscreverTorneioSchema = z.object({
  timeId: uuidCampo("timeId").optional(),
});

export const ingressarViaTorneioSchema = z.object({
  deckId: uuidCampo("deckId"),
});

export const gerarLinkIngressoSchema = z.object({
  validadeHoras: z.number().int().min(1, "validadeHoras deve ser >= 1.").max(168, "validadeHoras não pode exceder 168 horas.").optional(),
});

export const atualizarMesaPartidaSchema = z.object({
  mesa: z.number().int().min(1).nullable().optional(),
});

export const anuncioSiteSchema = z.object({
  id: z.string().max(180).optional(),
  tipo: z.enum(["banner", "card"]).optional(),
  tag: z.string().max(80).optional(),
  titulo: z.string().max(180).optional(),
  texto: z.string().max(900).optional(),
  imagemUrl: z.string().max(800).optional(),
  link: z.string().max(800).optional(),
  botaoTexto: z.string().max(120).optional(),
  ativo: z.boolean().optional(),
  ordem: z.number().int().optional(),
});

export const entrarPorConviteTimeSchema = z.object({
  conviteToken: z.string().uuid("conviteToken deve ser um UUID válido."),
});

export const salvarAnunciosSchema = z.object({
  anuncios: z.array(anuncioSiteSchema).max(20, "Informe no máximo 20 anúncios."),
});

const diasMetagameSchema = z.preprocess(
  (valor) => (valor === undefined || valor === null || valor === "" ? 30 : valor),
  z.coerce
    .number()
    .int("dias deve ser inteiro.")
    .refine((n) => [7, 14, 30, 90].includes(n), {
      message: "dias deve ser 7, 14, 30 ou 90.",
    })
);

export const listarMetagameQuerySchema = z.object({
  formato: z.string().trim().min(1, "Formato é obrigatório.").max(50),
  dias: diasMetagameSchema,
});

export const metagameDiasQuerySchema = z.object({
  dias: diasMetagameSchema,
  limiteListas: z.coerce.number().int().min(1).max(100).optional(),
});

export const metagameArquetipoParamsSchema = z.object({
  formato: z.string().trim().min(1, "Formato é obrigatório.").max(50),
  slug: z
    .string()
    .trim()
    .min(1, "slug é obrigatório.")
    .max(120)
    .regex(/^[a-z0-9-]+$/, "slug inválido."),
});
