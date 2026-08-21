/* eslint-disable @typescript-eslint/no-explicit-any */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Carta, Deck } from "../../dominio/entidade/deck";
import { Inscricao } from "../../dominio/entidade/inscricao";
import { Liga } from "../../dominio/entidade/liga";
import { Partida } from "../../dominio/entidade/partida";
import { StoryFundo } from "../../dominio/entidade/storyFundo";
import { Time } from "../../dominio/entidade/time";
import { Torneio } from "../../dominio/entidade/torneio";
import { Usuario } from "../../dominio/entidade/usuario";
import { conectarMongoDB } from "../mongodb/conexao";
import { DeckDynamoRepositorio } from "./repositorios/deckDynamoRepositorio";
import { InscricaoDynamoRepositorio } from "./repositorios/inscricaoDynamoRepositorio";
import { LigaDynamoRepositorio } from "./repositorios/ligaDynamoRepositorio";
import { PartidaDynamoRepositorio } from "./repositorios/partidaDynamoRepositorio";
import { SiteConfigDynamoRepositorio } from "./repositorios/siteConfigDynamoRepositorio";
import { StoryFundoDynamoRepositorio } from "./repositorios/storyFundoDynamoRepositorio";
import { TimeDynamoRepositorio } from "./repositorios/timeDynamoRepositorio";
import { TorneioDynamoRepositorio } from "./repositorios/torneioDynamoRepositorio";
import { UsuarioDynamoRepositorio } from "./repositorios/usuarioDynamoRepositorio";
import { BaseDynamoRepositorio } from "./repositorios/baseDynamoRepositorio";

dotenv.config();

type CollectionName =
  | "usuarios"
  | "decks"
  | "torneios"
  | "inscricoes"
  | "partidas"
  | "ligas"
  | "times"
  | "siteconfigs"
  | "storyfundos"
  | "tokenblacklists"
  | "refreshtokens"
  | "resetsenhas"
  | "linkingressos"
  | "loginattempts";

type ResultadoMigracao = {
  colecao: CollectionName;
  lidos: number;
  gravados: number;
  pulados: number;
};

class DynamoMigrationWriter extends BaseDynamoRepositorio {
  public static criar() {
    return new DynamoMigrationWriter();
  }

  public async put<T>(
    pk: string,
    sk: string,
    payload: T,
    extras: Record<string, string | number | Date | undefined> = {}
  ): Promise<void> {
    await this.putJson(pk, sk, payload, extras);
  }
}

const dryRun = process.argv.includes("--dry-run");
const colecoesSelecionadas = new Set(
  process.argv
    .filter((arg) => arg.startsWith("--only="))
    .flatMap((arg) => arg.replace("--only=", "").split(","))
    .map((nome) => nome.trim())
    .filter(Boolean)
);

const mongoCollectionAliases: Record<CollectionName, string[]> = {
  usuarios: ["usuarios"],
  decks: ["decks"],
  torneios: ["torneios"],
  inscricoes: ["inscricoes", "inscricaos"],
  partidas: ["partidas"],
  ligas: ["ligas"],
  times: ["times"],
  siteconfigs: ["siteconfigs"],
  storyfundos: ["storyfundos"],
  tokenblacklists: ["tokenblacklists"],
  refreshtokens: ["refreshtokens"],
  resetsenhas: ["resetsenhas"],
  linkingressos: ["linkingressos"],
  loginattempts: ["loginattempts"],
};

function deveMigrar(colecao: CollectionName): boolean {
  return colecoesSelecionadas.size === 0 || colecoesSelecionadas.has(colecao);
}

function asDate(value: unknown, fallback = new Date()): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

async function migrarColecao(
  colecao: CollectionName,
  migrarDoc: (doc: Record<string, any>) => Promise<boolean>
): Promise<ResultadoMigracao> {
  if (!deveMigrar(colecao)) {
    return { colecao, lidos: 0, gravados: 0, pulados: 0 };
  }

  const db = mongoose.connection.db;
  if (!db) throw new Error("Conexão MongoDB sem database ativo.");

  const colecoesExistentes = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name));
  const nomeMongo = mongoCollectionAliases[colecao].find((nome) => colecoesExistentes.has(nome));
  if (!nomeMongo) {
    return { colecao, lidos: 0, gravados: 0, pulados: 0 };
  }

  let lidos = 0;
  let gravados = 0;
  let pulados = 0;
  const cursor = db.collection(nomeMongo).find({});
  for await (const doc of cursor) {
    lidos += 1;
    try {
      const gravou = await migrarDoc(doc as Record<string, any>);
      if (gravou) gravados += 1;
      else pulados += 1;
    } catch (error) {
      pulados += 1;
      console.error(`[${colecao}] erro ao migrar documento`, doc.id ?? doc._id, error);
    }
  }

  return { colecao, lidos, gravados, pulados };
}

async function main(): Promise<void> {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI é obrigatório para migrar.");
  if (!process.env.DYNAMODB_DATA_TABLE && !dryRun) {
    throw new Error("DYNAMODB_DATA_TABLE é obrigatório para gravar no DynamoDB.");
  }

  await conectarMongoDB();

  const usuarioRepo = UsuarioDynamoRepositorio.criar();
  const deckRepo = DeckDynamoRepositorio.criar();
  const torneioRepo = TorneioDynamoRepositorio.criar();
  const inscricaoRepo = InscricaoDynamoRepositorio.criar();
  const partidaRepo = PartidaDynamoRepositorio.criar();
  const ligaRepo = LigaDynamoRepositorio.criar();
  const timeRepo = TimeDynamoRepositorio.criar();
  const siteConfigRepo = SiteConfigDynamoRepositorio.criar();
  const storyFundoRepo = StoryFundoDynamoRepositorio.criar();
  const writer = DynamoMigrationWriter.criar();

  const resultados: ResultadoMigracao[] = [];

  resultados.push(await migrarColecao("usuarios", async (doc) => {
    const usuario = new Usuario({
      id: asString(doc.id),
      nome: asString(doc.nome),
      email: asString(doc.email),
      senha: asString(doc.senha),
      role: doc.role === "admin" ? "admin" : "user",
      telefone: doc.telefone,
      nickMTGO: doc.nickMTGO,
      nickArena: doc.nickArena,
      resultadosExpressivos: asNumber(doc.resultadosExpressivos),
      bloqueadoTorneios: asBool(doc.bloqueadoTorneios),
      excluido: asBool(doc.excluido),
      excluidoEm: doc.excluidoEm ? asDate(doc.excluidoEm) : null,
      criadoEm: asDate(doc.criadoEm),
    });
    if (dryRun) return true;
    await usuarioRepo.salvar(usuario);
    return true;
  }));

  resultados.push(await migrarColecao("decks", async (doc) => {
    const deck = new Deck({
      id: asString(doc.id),
      nome: asString(doc.nome),
      nomeConsolidado: doc.nomeConsolidado ?? null,
      cartaRepresentativa: doc.cartaRepresentativa ?? null,
      formato: asString(doc.formato),
      linkLigaMagic: doc.linkLigaMagic ?? null,
      maindeck: asArray<Carta>(doc.maindeck),
      sideboard: asArray<Carta>(doc.sideboard),
      commander: asArray<Carta>(doc.commander),
      usuarioId: asString(doc.usuarioId),
      visualizacoes: asNumber(doc.visualizacoes),
      oculto: asBool(doc.oculto),
      travado: asBool(doc.travado),
      torneioId: doc.torneioId ?? null,
      deckOriginalId: doc.deckOriginalId ?? null,
      criadoEm: asDate(doc.criadoEm),
    });
    if (dryRun) return true;
    await deckRepo.salvar(deck);
    return true;
  }));

  resultados.push(await migrarColecao("torneios", async (doc) => {
    const torneio = new Torneio({
      id: asString(doc.id),
      nome: asString(doc.nome),
      horario: asDate(doc.horario),
      formato: asString(doc.formato),
      donoId: asString(doc.donoId),
      anfitriaoId: doc.anfitriaoId ?? null,
      status: doc.status,
      rodadaAtual: asNumber(doc.rodadaAtual),
      totalRodadas: asNumber(doc.totalRodadas),
      descricao: doc.descricao ?? undefined,
      regras: doc.regras ?? undefined,
      bannerUrl: doc.bannerUrl ?? undefined,
      linkBanner: doc.linkBanner ?? undefined,
      somRodada: doc.somRodada ?? undefined,
      storyFundoUrl: doc.storyFundoUrl ?? undefined,
      storyFundoTextoRodape: doc.storyFundoTextoRodape ?? "escuro",
      maxJogadores: doc.maxJogadores,
      maxRodadas: doc.maxRodadas,
      corteTop: doc.corteTop,
      linkLive: doc.linkLive ?? undefined,
      emCorte: asBool(doc.emCorte),
      secreto: asBool(doc.secreto),
      exibirNomeJogador: doc.exibirNomeJogador ?? "nome",
      visualizacoes: asNumber(doc.visualizacoes),
      criadoEm: asDate(doc.criadoEm),
      rodadaIniciadaEm: doc.rodadaIniciadaEm ? asDate(doc.rodadaIniciadaEm) : undefined,
    });
    if (dryRun) return true;
    await torneioRepo.salvar(torneio);
    return true;
  }));

  resultados.push(await migrarColecao("inscricoes", async (doc) => {
    const inscricao = new Inscricao({
      id: asString(doc.id),
      torneioId: asString(doc.torneioId),
      usuarioId: asString(doc.usuarioId),
      deckId: doc.deckId,
      timeId: doc.timeId,
      checkInRodada: asNumber(doc.checkInRodada, -1),
      dropped: asBool(doc.dropped),
      droppedRodada: doc.droppedRodada ?? null,
      dropPartidaIds: asArray<string>(doc.dropPartidaIds),
      byeCount: asNumber(doc.byeCount),
      criadoEm: asDate(doc.criadoEm),
    });
    if (dryRun) return true;
    await inscricaoRepo.salvar(inscricao);
    return true;
  }));

  resultados.push(await migrarColecao("partidas", async (doc) => {
    const partida = new Partida({
      id: asString(doc.id),
      torneioId: asString(doc.torneioId),
      rodada: asNumber(doc.rodada),
      jogador1Id: asString(doc.jogador1Id),
      jogador2Id: doc.jogador2Id ?? null,
      deckJogador1Id: doc.deckJogador1Id ?? undefined,
      deckJogador2Id: doc.deckJogador2Id ?? undefined,
      vitoriasJogador1: asNumber(doc.vitoriasJogador1),
      vitoriasJogador2: asNumber(doc.vitoriasJogador2),
      status: doc.status,
      contestado: asBool(doc.contestado),
      observacaoContestacao: doc.observacaoContestacao ?? null,
      tipoBye: doc.tipoBye ?? null,
      confirmadoPor: asArray<string>(doc.confirmadoPor),
      mesa: doc.mesa ?? null,
      criadoEm: asDate(doc.criadoEm),
    });
    if (dryRun) return true;
    await partidaRepo.salvar(partida);
    return true;
  }));

  resultados.push(await migrarColecao("ligas", async (doc) => {
    const liga = new Liga({
      id: asString(doc.id),
      nome: asString(doc.nome),
      descricao: doc.descricao ?? undefined,
      donoId: asString(doc.donoId),
      torneioIds: asArray<string>(doc.torneioIds),
      tipo: doc.tipo ?? "individual",
      criadoEm: asDate(doc.criadoEm),
    });
    if (dryRun) return true;
    await ligaRepo.salvar(liga);
    return true;
  }));

  resultados.push(await migrarColecao("times", async (doc) => {
    const time = new Time({
      id: asString(doc.id),
      nome: asString(doc.nome),
      descricao: doc.descricao ?? undefined,
      imagemUrl: doc.imagemUrl ?? undefined,
      donoId: asString(doc.donoId),
      membroIds: asArray<string>(doc.membroIds),
      solicitacoesPendentes: asArray<string>(doc.solicitacoesPendentes),
      conviteToken: doc.conviteToken ?? undefined,
      criadoEm: asDate(doc.criadoEm),
    });
    if (dryRun) return true;
    await timeRepo.salvar(time);
    return true;
  }));

  resultados.push(await migrarColecao("siteconfigs", async (doc) => {
    if (doc.chave !== "anuncios") return false;
    if (dryRun) return true;
    await siteConfigRepo.salvarAnuncios({
      anuncios: asArray(doc.anuncios),
      atualizadoEm: doc.atualizadoEm ? asDate(doc.atualizadoEm) : undefined,
    });
    return true;
  }));

  resultados.push(await migrarColecao("storyfundos", async (doc) => {
    const fundo = new StoryFundo({
      id: asString(doc.id),
      nome: asString(doc.nome),
      url: asString(doc.url),
      textoRodape: doc.textoRodape ?? "claro",
      criadoEm: asDate(doc.criadoEm),
    });
    if (dryRun) return true;
    await storyFundoRepo.salvar(fundo);
    return true;
  }));

  resultados.push(await migrarColecao("tokenblacklists", async (doc) => {
    const token = asString(doc.token);
    const expiresAt = asDate(doc.expiresAt);
    if (!token || expiresAt <= new Date()) return false;
    if (dryRun) return true;
    await writer.put(`TOKEN_BLACKLIST#${token}`, "DATA", { token, expiresAt: expiresAt.toISOString() }, { entity: "TOKEN_BLACKLIST", expiresAt });
    return true;
  }));

  resultados.push(await migrarColecao("refreshtokens", async (doc) => {
    const tokenHash = asString(doc.tokenHash || doc.token);
    const usuarioId = asString(doc.usuarioId);
    const expiresAt = asDate(doc.expiresAt);
    if (!tokenHash || !usuarioId || expiresAt <= new Date()) return false;
    const item = { tokenHash, usuarioId, expiresAt: expiresAt.toISOString() };
    if (dryRun) return true;
    await writer.put(`REFRESH_TOKEN#${tokenHash}`, "DATA", item, { entity: "REFRESH_TOKEN", expiresAt });
    await writer.put(`USER#${usuarioId}`, `REFRESH_TOKEN#${tokenHash}`, item, { entity: "REFRESH_TOKEN_INDEX", expiresAt });
    return true;
  }));

  resultados.push(await migrarColecao("resetsenhas", async (doc) => {
    const tokenHash = asString(doc.tokenHash || doc.token);
    const usuarioId = asString(doc.usuarioId);
    const expiresAt = asDate(doc.expiresAt);
    if (!tokenHash || !usuarioId || expiresAt <= new Date()) return false;
    const item = { tokenHash, usuarioId, expiresAt: expiresAt.toISOString() };
    if (dryRun) return true;
    await writer.put(`RESET_SENHA#${tokenHash}`, "DATA", item, { entity: "RESET_SENHA", expiresAt });
    await writer.put(`USER#${usuarioId}`, `RESET_SENHA#${tokenHash}`, item, { entity: "RESET_SENHA_INDEX", expiresAt });
    return true;
  }));

  resultados.push(await migrarColecao("linkingressos", async (doc) => {
    const token = asString(doc.token);
    const expiresAt = asDate(doc.expiresAt);
    if (!token || expiresAt <= new Date()) return false;
    if (dryRun) return true;
    await writer.put(`LINK_INGRESSO#${token}`, "DATA", {
      token,
      torneioId: asString(doc.torneioId),
      criadoPorId: asString(doc.criadoPorId),
      expiresAt: expiresAt.toISOString(),
    }, { entity: "LINK_INGRESSO", expiresAt });
    return true;
  }));

  resultados.push(await migrarColecao("loginattempts", async (doc) => {
    const email = asString(doc.email).toLowerCase().trim();
    const expiresAt = asDate(doc.expiresAt);
    if (!email || expiresAt <= new Date()) return false;
    if (dryRun) return true;
    await writer.put(`LOGIN_ATTEMPT#${email}`, "DATA", {
      email,
      tentativas: asNumber(doc.tentativas),
      expiresAt: expiresAt.toISOString(),
    }, { entity: "LOGIN_ATTEMPT", expiresAt });
    return true;
  }));

  console.table(resultados.filter((resultado) => deveMigrar(resultado.colecao)));
  const totalGravados = resultados.reduce((acc, item) => acc + item.gravados, 0);
  console.log(dryRun ? `Dry-run concluído. Itens que seriam gravados: ${totalGravados}` : `Migração concluída. Itens gravados: ${totalGravados}`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Falha na migração MongoDB -> DynamoDB", error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
