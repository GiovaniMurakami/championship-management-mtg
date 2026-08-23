/* eslint-disable @typescript-eslint/no-explicit-any */
import dotenv from "dotenv";
import { BatchWriteItemCommand, DynamoDBClient, ScanCommand, type WriteRequest } from "@aws-sdk/client-dynamodb";
import { MongoClient, type Db } from "mongodb";
import { Carta, Deck } from "../../dominio/entidade/deck";
import { Inscricao } from "../../dominio/entidade/inscricao";
import { Liga } from "../../dominio/entidade/liga";
import { Partida } from "../../dominio/entidade/partida";
import { StoryFundo } from "../../dominio/entidade/storyFundo";
import { Time } from "../../dominio/entidade/time";
import { Torneio } from "../../dominio/entidade/torneio";
import { Usuario } from "../../dominio/entidade/usuario";
import { DeckDynamoRepositorio } from "./repositorios/deckDynamoRepositorio";
import { InscricaoDynamoRepositorio } from "./repositorios/inscricaoDynamoRepositorio";
import { LigaDynamoRepositorio } from "./repositorios/ligaDynamoRepositorio";
import { PartidaDynamoRepositorio } from "./repositorios/partidaDynamoRepositorio";
import { SiteConfigDynamoRepositorio } from "./repositorios/siteConfigDynamoRepositorio";
import { StoryFundoDynamoRepositorio } from "./repositorios/storyFundoDynamoRepositorio";
import { TimeDynamoRepositorio } from "./repositorios/timeDynamoRepositorio";
import { TorneioDynamoRepositorio } from "./repositorios/torneioDynamoRepositorio";
import { UsuarioDynamoRepositorio } from "./repositorios/usuarioDynamoRepositorio";

dotenv.config();

type Colecao = "usuarios" | "decks" | "torneios" | "inscricoes" | "partidas" | "ligas" | "times" | "siteconfigs" | "storyfundos";
type Resultado = { colecao: Colecao; lidos: number; gravados: number; pulados: number };

const dryRun = process.argv.includes("--dry-run");
const truncate = process.argv.includes("--truncate");
const somente = new Set(process.argv.filter((arg) => arg.startsWith("--only=")).flatMap((arg) => arg.slice(7).split(",")));
const tabela = process.env.DYNAMODB_DATA_TABLE ?? "";
const region = process.env.DYNAMODB_DATA_REGION || process.env.AWS_REGION || "us-east-1";

const texto = (valor: unknown, padrao = "") => typeof valor === "string" ? valor : padrao;
const numero = (valor: unknown, padrao = 0) => typeof valor === "number" && Number.isFinite(valor) ? valor : padrao;
const bool = (valor: unknown, padrao = false) => typeof valor === "boolean" ? valor : padrao;
const lista = <T>(valor: unknown): T[] => Array.isArray(valor) ? valor as T[] : [];
const data = (valor: unknown, padrao = new Date()) => {
  const resultado = valor instanceof Date ? valor : new Date(valor as string | number);
  return Number.isNaN(resultado.getTime()) ? padrao : resultado;
};

function selecionada(colecao: Colecao): boolean {
  return somente.size === 0 || somente.has(colecao);
}

async function limparTabela(): Promise<number> {
  if (!/(local|test)/i.test(tabela)) {
    throw new Error(`--truncate bloqueado: DYNAMODB_DATA_TABLE deve conter local ou test; recebido: ${tabela || "vazio"}`);
  }

  const cliente = new DynamoDBClient({ region });
  let removidos = 0;
  let cursor: Record<string, any> | undefined;
  try {
    do {
      const pagina = await cliente.send(new ScanCommand({
        TableName: tabela,
        ProjectionExpression: "pk, sk",
        ExclusiveStartKey: cursor,
        ConsistentRead: true,
      }));
      const chaves = pagina.Items ?? [];
      for (let indice = 0; indice < chaves.length; indice += 25) {
        let pendentes: WriteRequest[] = chaves.slice(indice, indice + 25).map((Key) => ({ DeleteRequest: { Key } }));
        for (let tentativa = 0; pendentes.length > 0 && tentativa < 8; tentativa += 1) {
          const resposta = await cliente.send(new BatchWriteItemCommand({ RequestItems: { [tabela]: pendentes } }));
          pendentes = resposta.UnprocessedItems?.[tabela] ?? [];
          if (pendentes.length) await new Promise((resolve) => setTimeout(resolve, Math.min(1000, 50 * 2 ** tentativa)));
        }
        if (pendentes.length) throw new Error(`${pendentes.length} item(ns) nao removido(s) durante --truncate`);
        removidos += Math.min(25, chaves.length - indice);
        if (removidos % 500 === 0) {
          console.log(`[truncate] ${removidos} item(ns) removido(s)...`);
        }
      }
      cursor = pagina.LastEvaluatedKey;
    } while (cursor);
  } finally {
    cliente.destroy();
  }
  return removidos;
}

async function migrarColecao(db: Db, colecao: Colecao, migrar: (doc: any) => Promise<boolean>): Promise<Resultado> {
  if (!selecionada(colecao)) return { colecao, lidos: 0, gravados: 0, pulados: 0 };
  const nomes = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name));
  const aliases = colecao === "inscricoes" ? ["inscricoes", "inscricaos"] : [colecao];
  const nome = aliases.find((item) => nomes.has(item));
  if (!nome) return { colecao, lidos: 0, gravados: 0, pulados: 0 };

  const resultado: Resultado = { colecao, lidos: 0, gravados: 0, pulados: 0 };
  for await (const doc of db.collection(nome).find({})) {
    resultado.lidos++;
    try {
      if (await migrar(doc)) resultado.gravados++;
      else resultado.pulados++;
    } catch (error) {
      resultado.pulados++;
      console.error(`[${colecao}] documento ignorado`, doc.id ?? doc._id, error);
    }
    if (resultado.lidos % 100 === 0) {
      console.log(
        `[${colecao}] lidos=${resultado.lidos}, gravados=${resultado.gravados}, pulados=${resultado.pulados}`
      );
    }
  }
  console.log(
    `[${colecao}] concluida: lidos=${resultado.lidos}, gravados=${resultado.gravados}, pulados=${resultado.pulados}`
  );
  return resultado;
}

async function executar(): Promise<void> {
  const uri = process.env.MONGODB_MIGRATION_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_MIGRATION_URI e obrigatoria para migrar.");
  if (!tabela && !dryRun) throw new Error("DYNAMODB_DATA_TABLE e obrigatoria para gravar.");

  const mongo = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
  await mongo.connect();
  const nomeBanco = process.env.MONGODB_MIGRATION_DB_NAME?.trim();
  const db = nomeBanco ? mongo.db(nomeBanco) : mongo.db();

  try {
    const colecoesOrigem = new Set(
      (await db.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name)
    );
    const colecoesObrigatorias = ["usuarios", "torneios", "partidas"];
    const ausentes = colecoesObrigatorias.filter((nome) => !colecoesOrigem.has(nome));
    if (ausentes.length > 0) {
      throw new Error(
        `Banco MongoDB de origem invalido (${db.databaseName}): colecao(oes) ausente(s): ${ausentes.join(", ")}`
      );
    }

    const torneioIds = new Set<string>();
    for await (const doc of db.collection("torneios").find({}, { projection: { id: 1 } })) {
      if (typeof doc.id === "string" && doc.id) torneioIds.add(doc.id);
    }
    if (torneioIds.size === 0) {
      throw new Error(`Banco MongoDB de origem invalido (${db.databaseName}): nenhum torneio encontrado.`);
    }

    console.log(`Origem validada: banco=${db.databaseName}, torneios=${torneioIds.size}.`);

    if (truncate && !dryRun) {
      console.log(`Tabela ${tabela} limpa: ${await limparTabela()} item(ns) removido(s).`);
    }

    const repos = {
      usuario: UsuarioDynamoRepositorio.criar(), deck: DeckDynamoRepositorio.criar(), torneio: TorneioDynamoRepositorio.criar(),
      inscricao: InscricaoDynamoRepositorio.criar(), partida: PartidaDynamoRepositorio.criar(), liga: LigaDynamoRepositorio.criar(),
      time: TimeDynamoRepositorio.criar(), site: SiteConfigDynamoRepositorio.criar(), story: StoryFundoDynamoRepositorio.criar(),
    };
    const resultados: Resultado[] = [];

    resultados.push(await migrarColecao(db, "usuarios", async (doc) => {
      const entidade = new Usuario({ id: texto(doc.id), nome: texto(doc.nome), email: texto(doc.email), senha: texto(doc.senha), role: doc.role === "admin" ? "admin" : "user", telefone: doc.telefone, nickMTGO: doc.nickMTGO, nickArena: doc.nickArena, resultadosExpressivos: numero(doc.resultadosExpressivos), bloqueadoTorneios: bool(doc.bloqueadoTorneios), excluido: bool(doc.excluido), excluidoEm: doc.excluidoEm ? data(doc.excluidoEm) : null, criadoEm: data(doc.criadoEm) });
      if (!dryRun) await repos.usuario.salvar(entidade);
      return true;
    }));
    resultados.push(await migrarColecao(db, "decks", async (doc) => {
      const entidade = new Deck({ id: texto(doc.id), nome: texto(doc.nome), nomeConsolidado: doc.nomeConsolidado ?? null, cartaRepresentativa: doc.cartaRepresentativa ?? null, formato: texto(doc.formato), linkLigaMagic: doc.linkLigaMagic ?? null, maindeck: lista<Carta>(doc.maindeck), sideboard: lista<Carta>(doc.sideboard), commander: lista<Carta>(doc.commander), usuarioId: texto(doc.usuarioId), visualizacoes: numero(doc.visualizacoes), oculto: bool(doc.oculto), travado: bool(doc.travado), torneioId: doc.torneioId ?? null, deckOriginalId: doc.deckOriginalId ?? null, criadoEm: data(doc.criadoEm) });
      if (!dryRun) await repos.deck.salvar(entidade);
      return true;
    }));
    resultados.push(await migrarColecao(db, "torneios", async (doc) => {
      const entidade = new Torneio({ id: texto(doc.id), nome: texto(doc.nome), horario: data(doc.horario), formato: texto(doc.formato), donoId: texto(doc.donoId), anfitriaoId: doc.anfitriaoId ?? null, status: doc.status, rodadaAtual: numero(doc.rodadaAtual), totalRodadas: numero(doc.totalRodadas), descricao: doc.descricao, regras: doc.regras, bannerUrl: doc.bannerUrl, linkBanner: doc.linkBanner, somRodada: doc.somRodada, storyFundoUrl: doc.storyFundoUrl, storyFundoTextoRodape: doc.storyFundoTextoRodape ?? "escuro", maxJogadores: doc.maxJogadores, maxRodadas: doc.maxRodadas, corteTop: doc.corteTop, linkLive: doc.linkLive, emCorte: bool(doc.emCorte), secreto: bool(doc.secreto), exibirNomeJogador: doc.exibirNomeJogador ?? "nome", visualizacoes: numero(doc.visualizacoes), criadoEm: data(doc.criadoEm), rodadaIniciadaEm: doc.rodadaIniciadaEm ? data(doc.rodadaIniciadaEm) : undefined });
      if (!dryRun) await repos.torneio.salvar(entidade);
      return true;
    }));
    resultados.push(await migrarColecao(db, "inscricoes", async (doc) => {
      const torneioId = texto(doc.torneioId);
      if (!torneioIds.has(torneioId)) return false;
      const entidade = new Inscricao({ id: texto(doc.id), torneioId, usuarioId: texto(doc.usuarioId), deckId: doc.deckId, timeId: doc.timeId, checkInRodada: numero(doc.checkInRodada, -1), dropped: bool(doc.dropped), droppedRodada: doc.droppedRodada ?? null, dropPartidaIds: lista<string>(doc.dropPartidaIds), byeCount: numero(doc.byeCount), criadoEm: data(doc.criadoEm) });
      if (!dryRun) await repos.inscricao.salvar(entidade);
      return true;
    }));
    resultados.push(await migrarColecao(db, "partidas", async (doc) => {
      const torneioId = texto(doc.torneioId);
      if (!torneioIds.has(torneioId)) return false;
      const entidade = new Partida({ id: texto(doc.id), torneioId, rodada: numero(doc.rodada), jogador1Id: texto(doc.jogador1Id), jogador2Id: doc.jogador2Id ?? null, deckJogador1Id: doc.deckJogador1Id, deckJogador2Id: doc.deckJogador2Id, vitoriasJogador1: numero(doc.vitoriasJogador1), vitoriasJogador2: numero(doc.vitoriasJogador2), status: doc.status, contestado: bool(doc.contestado), observacaoContestacao: doc.observacaoContestacao ?? null, tipoBye: doc.tipoBye ?? null, confirmadoPor: lista<string>(doc.confirmadoPor), mesa: doc.mesa ?? null, criadoEm: data(doc.criadoEm) });
      if (!dryRun) await repos.partida.salvar(entidade);
      return true;
    }));
    resultados.push(await migrarColecao(db, "ligas", async (doc) => {
      const entidade = new Liga({ id: texto(doc.id), nome: texto(doc.nome), descricao: doc.descricao, donoId: texto(doc.donoId), torneioIds: lista<string>(doc.torneioIds).filter((id) => torneioIds.has(id)), tipo: doc.tipo ?? "individual", criadoEm: data(doc.criadoEm) });
      if (!dryRun) await repos.liga.salvar(entidade);
      return true;
    }));
    resultados.push(await migrarColecao(db, "times", async (doc) => {
      const entidade = new Time({ id: texto(doc.id), nome: texto(doc.nome), descricao: doc.descricao, imagemUrl: doc.imagemUrl, donoId: texto(doc.donoId), membroIds: lista<string>(doc.membroIds), solicitacoesPendentes: lista<string>(doc.solicitacoesPendentes), conviteToken: doc.conviteToken, criadoEm: data(doc.criadoEm) });
      if (!dryRun) await repos.time.salvar(entidade);
      return true;
    }));
    resultados.push(await migrarColecao(db, "siteconfigs", async (doc) => {
      if (doc.chave !== "anuncios") return false;
      if (!dryRun) await repos.site.salvarAnuncios({ anuncios: lista(doc.anuncios), atualizadoEm: doc.atualizadoEm ? data(doc.atualizadoEm) : undefined });
      return true;
    }));
    resultados.push(await migrarColecao(db, "storyfundos", async (doc) => {
      const entidade = new StoryFundo({ id: texto(doc.id), nome: texto(doc.nome), url: texto(doc.url), textoRodape: doc.textoRodape ?? "claro", criadoEm: data(doc.criadoEm) });
      if (!dryRun) await repos.story.salvar(entidade);
      return true;
    }));

    console.table(resultados.filter((item) => selecionada(item.colecao)));
    const partidas = resultados.find((item) => item.colecao === "partidas");
    console.log(`Partidas orfas ignoradas: ${partidas?.pulados ?? 0}`);
    console.log(dryRun ? "Dry-run concluido; nenhuma gravacao realizada." : "Migracao concluida.");
  } finally {
    await mongo.close();
  }
}

void executar().catch((error) => {
  console.error("Falha na migracao MongoDB -> DynamoDB", error);
  process.exitCode = 1;
});
