#!/usr/bin/env node
/**
 * Exporta Top N (story 1080×1920) de torneios finalizados → S3 + POST /hall-da-fama
 * + cópia local em tmp/top8-export/.
 *
 * Uso:
 *   API_BASE=http://localhost:3000 \
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... \
 *   node scripts/exportarHallTop8.mjs
 *
 * Sem corteTop no torneio: usa Top 8 dos standings (fallback).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_BASE = (process.env.API_BASE || "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;
const TOKEN_ENV = process.env.ADMIN_TOKEN;
const OUT_DIR = process.env.OUT_DIR
  || path.resolve(__dirname, "../tmp/top8-export");
const DEFAULT_TOP = Number(process.env.TOP_N || 8);
const SOLID_BG = "#0e091c";
/** Fundo padrão do story (mesmo asset do front). */
const DEFAULT_BG_PATH = process.env.DEFAULT_TOP8_BG
  || path.resolve(
    __dirname,
    "../../championship-management-mtg-front/public/images/top8/fundoTop8.jpeg",
  );
/** Se 1: recria itens do Hall de torneios sem storyFundoUrl (usa fundo padrão). */
const REPLACE_SEM_FUNDO = process.env.REPLACE_SEM_FUNDO === "1";

const TOP8_CONTENT_START_RATIO = 0.28;
const TOP8_CARD_SLOT_FILL = 0.78;
const TOP8_NAME_X = 255;

// --- auth / HTTP ---

async function login() {
  if (TOKEN_ENV) return TOKEN_ENV;
  if (!EMAIL || !PASSWORD) throw new Error("Defina ADMIN_EMAIL + ADMIN_PASSWORD ou ADMIN_TOKEN");
  const res = await fetch(`${API_BASE}/usuario/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, senha: PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    throw new Error(`Login falhou (${res.status}): ${JSON.stringify(data)}`);
  }
  return data.token;
}

async function apiGet(pathUrl, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}${pathUrl}`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`GET ${pathUrl} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function apiPost(pathUrl, token, body) {
  const res = await fetch(`${API_BASE}${pathUrl}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`POST ${pathUrl} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function uploadPng(token, buf) {
  const presign = await apiPost("/imagem/upload-url", token, {
    contentType: "image/png",
    tamanhoBytes: buf.length,
  });
  const put = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: buf,
  });
  if (!put.ok) {
    const text = await put.text().catch(() => "");
    throw new Error(`Upload S3 falhou (${put.status}): ${text.slice(0, 200)}`);
  }
  return presign.urlPublica;
}

// --- listagem ---

async function listarTodosFinalizados(token) {
  const all = [];
  let offset = 0;
  for (;;) {
    const data = await apiGet(`/torneio/listar?status=finalizado&limite=100&offset=${offset}`, token);
    const page = data.torneios || [];
    all.push(...page);
    if (all.length >= (data.total || 0) || page.length === 0) break;
    offset += 100;
  }
  return all;
}

async function listarHallExistente() {
  /** @type {Map<string, { id: string, torneioId: string }>} */
  const byTorneio = new Map();
  let offset = 0;
  for (;;) {
    const data = await apiGet(`/hall-da-fama?limite=100&offset=${offset}`);
    for (const item of data.itens || []) {
      if (item.torneioId) byTorneio.set(item.torneioId, { id: item.id, torneioId: item.torneioId });
    }
    if (offset + (data.itens?.length || 0) >= (data.total || 0) || !(data.itens || []).length) break;
    offset += 100;
  }
  return byTorneio;
}

async function apiDelete(pathUrl, token) {
  const res = await fetch(`${API_BASE}${pathUrl}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`DELETE ${pathUrl} → ${res.status}: ${JSON.stringify(data)}`);
  }
}

async function resolveBackgroundUrl(storyFundoUrl) {
  const custom = String(storyFundoUrl || "").trim();
  if (custom) return custom;
  if (fs.existsSync(DEFAULT_BG_PATH)) return DEFAULT_BG_PATH;
  console.warn(`Fundo padrão não encontrado em ${DEFAULT_BG_PATH}; usando cor sólida.`);
  return null;
}

// --- top players (espelha EliminationBracket + fallback standings) ---

function standingPlayerId(player) {
  return player?.usuario?.id || player?.usuarioId || player?.userId || player?.id;
}

function getWinnerId(partida) {
  if (!partida || partida.status !== "finalizada") return null;
  if (!partida.jogador2Id && !partida.jogador2) return partida.jogador1Id || partida.jogador1?.id;
  const v1 = Number(partida.vitoriasJogador1 ?? 0);
  const v2 = Number(partida.vitoriasJogador2 ?? 0);
  if (v1 > v2) return partida.jogador1Id || partida.jogador1?.id;
  if (v2 > v1) return partida.jogador2Id || partida.jogador2?.id;
  return null;
}

function matchPlayerName(partida, side) {
  const nested = side === 1 ? partida.jogador1 : partida.jogador2;
  return nested?.nome || nested?.usuario?.nome || (side === 1 ? partida.jogador1Nome : partida.jogador2Nome) || "Jogador";
}

function fallbackPlayer(partida, side, id) {
  const nome = matchPlayerName(partida, side);
  return {
    usuarioId: id,
    usuario: { id, nome },
    nome,
    deckNome: "—",
  };
}

function getFirstEliminationRound(torneio) {
  if (!torneio?.emCorte) return null;
  const corteTop = Number(torneio?.corteTop || 0);
  const totalRodadas = Number(torneio?.totalRodadas || 0);
  const cutRounds = Math.log2(corteTop);
  if (!Number.isInteger(cutRounds) || cutRounds <= 0 || !totalRodadas) return null;
  return totalRodadas - cutRounds + 1;
}

function buildEliminationTopPlayers(partidas, firstCutRound, standings = [], { totalRodadas } = {}) {
  if (!firstCutRound) return [];
  const byId = new Map(
    (standings || [])
      .map((player) => [standingPlayerId(player), player])
      .filter(([id]) => Boolean(id)),
  );
  const firstRound = (partidas || [])
    .filter((partida) => Number(partida?.rodada) === Number(firstCutRound))
    .sort((a, b) => Number(a?.mesa ?? 0) - Number(b?.mesa ?? 0));

  const meta = new Map();
  for (const partida of firstRound) {
    for (const side of [1, 2]) {
      const id = side === 1
        ? (partida.jogador1Id || partida.jogador1?.id)
        : (partida.jogador2Id || partida.jogador2?.id);
      if (!id || meta.has(id)) continue;
      const standing = byId.get(id);
      meta.set(id, {
        player: standing || fallbackPlayer(partida, side, id),
        wonFinal: false,
        eliminatedRound: null,
        maxRound: Number(firstCutRound),
        mesa: Number(partida.mesa ?? 0),
        swissPos: Number(standing?.posicao ?? 9999),
      });
    }
  }
  if (meta.size === 0) return [];

  const cutMatches = (partidas || [])
    .filter((partida) => Number(partida?.rodada) >= Number(firstCutRound))
    .sort(
      (a, b) =>
        Number(a?.rodada ?? 0) - Number(b?.rodada ?? 0)
        || Number(a?.mesa ?? 0) - Number(b?.mesa ?? 0),
    );

  const finalRound = Number(totalRodadas || 0)
    || Math.max(...cutMatches.map((p) => Number(p.rodada || 0)), Number(firstCutRound));

  for (const partida of cutMatches) {
    const rodada = Number(partida.rodada || 0);
    const winnerId = getWinnerId(partida);
    for (const side of [1, 2]) {
      const id = side === 1
        ? (partida.jogador1Id || partida.jogador1?.id)
        : (partida.jogador2Id || partida.jogador2?.id);
      if (!id) continue;
      let entry = meta.get(id);
      if (!entry) {
        const standing = byId.get(id);
        entry = {
          player: standing || fallbackPlayer(partida, side, id),
          wonFinal: false,
          eliminatedRound: null,
          maxRound: rodada,
          mesa: Number(partida.mesa ?? 0),
          swissPos: Number(standing?.posicao ?? 9999),
        };
        meta.set(id, entry);
      }
      entry.maxRound = Math.max(entry.maxRound, rodada);
      entry.mesa = Number(partida.mesa ?? entry.mesa ?? 0);
      if (partida.status === "finalizada" && winnerId && id !== winnerId) {
        entry.eliminatedRound = rodada;
      }
      if (partida.status === "finalizada" && winnerId === id && rodada === finalRound) {
        entry.wonFinal = true;
      }
    }
  }

  const ranked = [...meta.values()].sort((a, b) => {
    if (a.wonFinal !== b.wonFinal) return a.wonFinal ? -1 : 1;
    const aAlive = a.eliminatedRound == null;
    const bAlive = b.eliminatedRound == null;
    if (aAlive !== bAlive) return aAlive ? -1 : 1;
    if (!aAlive && !bAlive && a.eliminatedRound !== b.eliminatedRound) {
      return b.eliminatedRound - a.eliminatedRound;
    }
    if (aAlive && bAlive && a.maxRound !== b.maxRound) {
      return b.maxRound - a.maxRound;
    }
    if (a.swissPos !== b.swissPos) return a.swissPos - b.swissPos;
    return a.mesa - b.mesa;
  });

  return ranked.map((entry, index) => ({
    ...entry.player,
    posicao: index + 1,
  }));
}

function topFromStandings(standings, n) {
  return [...(standings || [])]
    .sort((a, b) => Number(a.posicao ?? 9999) - Number(b.posicao ?? 9999))
    .slice(0, n)
    .map((p, i) => ({ ...p, posicao: p.posicao ?? i + 1 }));
}

async function montarPlayers(torneio, token) {
  const [standingsData, partidasData] = await Promise.all([
    apiGet(`/torneio/${torneio.id}/standings`, token),
    apiGet(`/torneio/${torneio.id}/partidas`, token),
  ]);
  const standings = standingsData.standings || standingsData;
  const partidas = partidasData.partidas || partidasData;
  const corteTop = Number(torneio.corteTop || 0);
  const n = corteTop >= 2 ? corteTop : DEFAULT_TOP;

  const firstCut = getFirstEliminationRound(torneio);
  let players = [];
  if (firstCut) {
    players = buildEliminationTopPlayers(partidas, firstCut, standings, {
      totalRodadas: torneio.totalRodadas,
    }).slice(0, n);
  }
  if (players.length < 2) {
    players = topFromStandings(standings, n);
  }
  return { players, standingsCount: Array.isArray(standings) ? standings.length : 0 };
}

// --- story helpers (espelha Top8StoryModal + top8Story.js) ---

const NAME_PARTICLES = new Set(["de", "da", "do", "dos", "das", "e", "del", "van", "von"]);
const NAME_SUFFIXES = new Set(["junior", "jr", "jr.", "filho", "neto"]);

function formatTop8StoryPlayerName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Jogador";
  if (parts.length <= 3) return parts.join(" ");
  let end = parts.length - 1;
  let suffix = "";
  if (NAME_SUFFIXES.has(parts[end].toLowerCase())) {
    suffix = " Jr.";
    end -= 1;
  }
  if (end >= 2 && NAME_PARTICLES.has(parts[end - 1].toLowerCase())) end -= 2;
  const core = parts
    .slice(0, end + 1)
    .filter((part, index, arr) => index === 0 || index === arr.length - 1 || part.length > 1);
  if (core.length <= 3) return `${core.join(" ")}${suffix}`.trim();
  if (NAME_PARTICLES.has(core[1].toLowerCase())) {
    return `${core[0]} ${core[core.length - 1]}${suffix}`.trim();
  }
  return `${core[0]} ${core[1]} ${core[core.length - 1]}${suffix}`.trim();
}

function formatTop8StoryRecord(player) {
  const vitorias = Number(player?.vitoriasPartida ?? player?.vitorias ?? 0);
  const derrotas = Number(player?.derrotasPartida ?? player?.derrotas ?? 0);
  return `${vitorias}-${derrotas}`;
}

function formatTop8StoryHeadline(horario, playerCount) {
  let dateLabel = "";
  if (horario) {
    try {
      dateLabel = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(horario));
    } catch {
      dateLabel = "";
    }
  }
  const n = Number(playerCount);
  const countLabel = Number.isFinite(n) && n > 0
    ? `${n} ${n === 1 ? "jogador" : "jogadores"}`
    : "";
  return [dateLabel, countLabel].filter(Boolean).join(" · ");
}

function getTop8StoryTextTheme(textoRodape = "escuro") {
  return textoRodape === "escuro"
    ? { color: "#1f1633", shadowColor: "rgba(255,255,255,0.72)" }
    : { color: "#c4b5fd", shadowColor: "rgba(0,0,0,0.7)" };
}

function top8StoryNameDeckLayout(cardH, nameFs, deckFs) {
  const h = Math.max(1, Number(cardH) || 1);
  const nf = Math.max(1, Number(nameFs) || 1);
  const df = Math.max(1, Number(deckFs) || 1);
  const nameDescent = nf * 0.32;
  const deckAscent = df * 0.78;
  const gap = Math.max(8, h * 0.06);
  let nameY = h * 0.38;
  let deckY = nameY + nameDescent + gap + deckAscent;
  const maxDeckY = h * 0.88;
  if (deckY > maxDeckY) {
    deckY = maxDeckY;
    nameY = Math.max(h * 0.28, deckY - deckAscent - gap - nameDescent);
  }
  return { nameY, deckY };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fitCanvasText(ctx, text, maxW) {
  const raw = String(text || "");
  if (!raw || ctx.measureText(raw).width <= maxW) return raw;
  let t = raw;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  const space = t.lastIndexOf(" ");
  if (space > Math.floor(t.length * 0.45)) t = t.slice(0, space);
  return `${t}…`;
}

function calcLayout(canvasH, headerEndY, bottomReserve, n, nominalCardH) {
  const available = canvasH - headerEndY - bottomReserve;
  const maxSlotH = Math.floor(available / n);
  const cardH = Math.min(nominalCardH, Math.floor(maxSlotH * TOP8_CARD_SLOT_FILL));
  const cardGap = maxSlotH - cardH;
  const totalH = n * cardH + Math.max(0, n - 1) * cardGap;
  const startY = headerEndY + Math.max(0, Math.floor((available - totalH) / 2));
  return { cardH, cardGap, startY };
}

function storyContentLayout(canvasH, n, nominalCardH, { hasHeadline = true } = {}) {
  const headerEndY = Math.round(canvasH * TOP8_CONTENT_START_RATIO);
  const metaBand = Math.round(canvasH * (hasHeadline ? 0.04 : 0.012));
  const layout = calcLayout(
    canvasH,
    headerEndY + metaBand,
    Math.round(canvasH * 0.018),
    n,
    nominalCardH,
  );
  return { ...layout, headlineY: headerEndY + metaBand * 0.48 };
}

function drawCoverImage(ctx, img, x, y, w, h) {
  if (!img) return false;
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  return true;
}

async function loadBackground(backgroundUrl) {
  if (!backgroundUrl) return null;
  try {
    return await loadImage(backgroundUrl);
  } catch {
    return null;
  }
}

async function renderTop8Png(players, { backgroundUrl, headline, textoRodape } = {}) {
  const W = 1080;
  const H = 1920;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  let backgroundImage = await loadBackground(backgroundUrl);
  if (!backgroundImage && backgroundUrl !== DEFAULT_BG_PATH && fs.existsSync(DEFAULT_BG_PATH)) {
    backgroundImage = await loadBackground(DEFAULT_BG_PATH);
  }

  if (!drawCoverImage(ctx, backgroundImage, 0, 0, W, H)) {
    ctx.fillStyle = SOLID_BG;
    ctx.fillRect(0, 0, W, H);
  }

  const n = players.length;
  const hasHeadline = Boolean(String(headline || "").trim());
  const { cardH, cardGap, startY, headlineY } = storyContentLayout(H, n, 150, { hasHeadline });
  const fontScale = Math.min(1, cardH / 150);

  if (hasHeadline) {
    const textTheme = getTop8StoryTextTheme(textoRodape);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let fontSize = Math.round(W * 0.038);
    const maxW = W * 0.88;
    ctx.font = `bold ${fontSize}px sans-serif`;
    while (ctx.measureText(headline).width > maxW && fontSize > 12) {
      fontSize -= 1;
      ctx.font = `bold ${fontSize}px sans-serif`;
    }
    ctx.fillStyle = textTheme.color;
    ctx.shadowColor = textTheme.shadowColor;
    ctx.shadowBlur = Math.round(W * 0.006);
    ctx.fillText(headline, W / 2, headlineY, maxW);
    ctx.restore();
  }

  players.forEach((player, i) => {
    const pos = player.posicao ?? i + 1;
    const name = formatTop8StoryPlayerName(player.usuario?.nome || player.nome || "Jogador");
    const deck = player.deckNome || "—";
    const record = formatTop8StoryRecord(player);
    const isGold = pos === 1;
    const isSilver = pos === 2;
    const isBronze = pos === 3;
    const y = startY + i * (cardH + cardGap);

    const cardGrads = ctx.createLinearGradient(60, y, W - 60, y + cardH);
    if (isGold) { cardGrads.addColorStop(0, "#4a3510"); cardGrads.addColorStop(1, "#16100a"); }
    else if (isSilver) { cardGrads.addColorStop(0, "#32343b"); cardGrads.addColorStop(1, "#10131b"); }
    else if (isBronze) { cardGrads.addColorStop(0, "#3a2418"); cardGrads.addColorStop(1, "#120d0a"); }
    else { cardGrads.addColorStop(0, "#23153a"); cardGrads.addColorStop(1, "#0d1022"); }
    ctx.fillStyle = cardGrads;
    roundRect(ctx, 60, y, W - 120, cardH, 18);
    ctx.fill();

    ctx.strokeStyle = isGold ? "rgba(255,215,0,0.65)" : isSilver ? "rgba(192,192,192,0.5)" : isBronze ? "rgba(205,127,50,0.5)" : "rgba(167,79,255,0.28)";
    ctx.lineWidth = pos <= 3 ? 2.5 : 1.2;
    roundRect(ctx, 60, y, W - 120, cardH, 18);
    ctx.stroke();

    if (pos <= 3) {
      ctx.fillStyle = isGold ? "#FFD700" : isSilver ? "#C0C0C0" : "#CD7F32";
      roundRect(ctx, 60, y, 8, cardH, 4);
      ctx.fill();
    }

    const posColor = isGold ? "#FFD700" : isSilver ? "#C0C0C0" : isBronze ? "#CD7F32" : "#9d74e8";
    const posFs = Math.round((isGold ? 78 : 66) * fontScale);
    ctx.font = `bold ${posFs}px sans-serif`;
    ctx.fillStyle = posColor;
    ctx.textAlign = "left";
    ctx.fillText(`#${pos}`, 96, y + cardH * 0.65);

    const recFs = Math.round((isGold ? 44 : 38) * fontScale);
    ctx.font = `bold ${recFs}px sans-serif`;
    const recordW = ctx.measureText(record).width;
    const textMaxW = Math.max(280, W - 90 - recordW - 28 - TOP8_NAME_X);

    const nameFs = Math.round((isGold ? 56 : 50) * fontScale);
    const deckFs = Math.round(40 * fontScale);
    const { nameY, deckY } = top8StoryNameDeckLayout(cardH, nameFs, deckFs);
    ctx.font = `bold ${nameFs}px sans-serif`;
    ctx.fillStyle = isGold ? "#fff8e0" : "#f0e6ff";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(fitCanvasText(ctx, name, textMaxW), TOP8_NAME_X, y + nameY);

    ctx.font = `${deckFs}px sans-serif`;
    ctx.fillStyle = isGold ? "#fcd34d" : "#a78bfa";
    ctx.fillText(fitCanvasText(ctx, deck, textMaxW * 0.92), TOP8_NAME_X, y + deckY);

    ctx.font = `bold ${recFs}px sans-serif`;
    ctx.fillStyle = isGold ? "#fde68a" : "#e8dfff";
    ctx.textAlign = "right";
    ctx.fillText(record, W - 90, y + cardH * 0.62);
    ctx.textAlign = "left";
  });

  return canvas.toBuffer("image/png");
}

function slugify(nome) {
  return String(nome || "torneio")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 60) || "torneio";
}

// --- main ---

async function main() {
  console.log(`API: ${API_BASE}`);
  console.log(`Fundo padrão: ${DEFAULT_BG_PATH} (${fs.existsSync(DEFAULT_BG_PATH) ? "ok" : "AUSENTE"})`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const token = await login();
  console.log("Login OK");

  const [torneios, existentes] = await Promise.all([
    listarTodosFinalizados(token),
    listarHallExistente(),
  ]);
  console.log(`Finalizados: ${torneios.length} | já no Hall: ${existentes.size}`);
  if (REPLACE_SEM_FUNDO) console.log("REPLACE_SEM_FUNDO=1 → recria itens sem storyFundoUrl");

  const stats = { ok: 0, skip: 0, erro: 0, replaced: 0 };

  for (let i = 0; i < torneios.length; i++) {
    const t = torneios[i];
    const label = `[${i + 1}/${torneios.length}] ${t.nome} (${t.id.slice(0, 8)})`;
    const semFundo = !String(t.storyFundoUrl || "").trim();
    const existente = existentes.get(t.id);

    if (existente && !(REPLACE_SEM_FUNDO && semFundo)) {
      console.log(`${label} → skip (já no Hall)`);
      stats.skip += 1;
      continue;
    }

    try {
      if (existente && REPLACE_SEM_FUNDO && semFundo) {
        await apiDelete(`/hall-da-fama/${encodeURIComponent(existente.id)}`, token);
        existentes.delete(t.id);
        stats.replaced += 1;
      }

      const { players, standingsCount } = await montarPlayers(t, token);
      if (players.length < 2) {
        console.log(`${label} → skip (<2 jogadores, standings=${standingsCount})`);
        stats.skip += 1;
        continue;
      }

      const headline = formatTop8StoryHeadline(t.horario, t.totalInscritos || standingsCount);
      const backgroundUrl = await resolveBackgroundUrl(t.storyFundoUrl);
      const png = await renderTop8Png(players, {
        backgroundUrl,
        headline,
        textoRodape: t.storyFundoTextoRodape || "escuro",
      });

      const fileName = `${t.id}-${slugify(t.nome)}.png`;
      const localPath = path.join(OUT_DIR, fileName);
      fs.writeFileSync(localPath, png);

      const imagemUrl = await uploadPng(token, png);
      await apiPost("/hall-da-fama", token, {
        torneioId: t.id,
        imagemUrl,
        torneioNome: t.nome,
      });
      existentes.set(t.id, { id: "new", torneioId: t.id });

      console.log(`${label} → ok top${players.length}${semFundo ? " (fundo padrão)" : ""} | ${localPath}`);
      stats.ok += 1;
    } catch (err) {
      console.error(`${label} → erro: ${err.message || err}`);
      stats.erro += 1;
    }
  }

  console.log(`\nResumo: ok=${stats.ok} replaced=${stats.replaced} skip=${stats.skip} erro=${stats.erro}`);
  console.log(`PNGs em ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
