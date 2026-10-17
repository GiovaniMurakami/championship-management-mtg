#!/usr/bin/env node
/**
 * One-shot: sobe logos de parceiros para S3 e cadastra em PUT /site/parceiros.
 *
 * Uso:
 *   API_BASE=http://localhost:3000 \
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... \
 *   node scripts/cadastrarParceirosHome.mjs
 *
 * Opcional: PARCEIROS_DIR=caminho/para/pngs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_BASE = (process.env.API_BASE || "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;
const TOKEN_ENV = process.env.ADMIN_TOKEN;

const FRONT_PARCEIROS = process.env.PARCEIROS_DIR
  || path.resolve(__dirname, "../../championship-management-mtg-front/public/images/landing/parceiros");

const PARCEIROS = [
  { arquivo: "bandeira-cards.png", nome: "Bandeira Cards", linkUrl: "https://bandeiracards.com.br" },
  { arquivo: "capi-cards.png", nome: "Capi Cards", linkUrl: "https://capicards.shop" },
  { arquivo: "cardtrader.png", nome: "CardTrader", linkUrl: "https://www.cardtrader.com/invite/FUGUETE05" },
  { arquivo: "dungeon.png", nome: "Dungeon Games", linkUrl: "https://dungeongamesstore.com.br" },
  { arquivo: "elfoman.png", nome: "Elfo Man", linkUrl: "https://elfoman.com.br" },
  { arquivo: "glorin.png", nome: "Glorin", linkUrl: "https://glorin.com.br/glorin" },
  { arquivo: "mineral.png", nome: "Mineral Games", linkUrl: "https://mineralgames.com.br" },
  { arquivo: "montshop.png", nome: "Mont Shop", linkUrl: "https://montshop.com.br" },
  { arquivo: "muka.png", nome: "Muka Traders", linkUrl: "https://mukatraders.com.br" },
  { arquivo: "orbita.png", nome: "Orbita Playmats", linkUrl: "https://www.instagram.com/orbitaplaymats" },
  { arquivo: "rei-das-cartinhas.png", nome: "Rei das Cartinhas", linkUrl: "https://reidascartinhas.com.br" },
  { arquivo: "taverna-games.png", nome: "Taverna Games", linkUrl: "https://lojatavernagames.com.br" },
  { arquivo: "tcg-inbox.png", nome: "TCG InBox", linkUrl: "https://tcginbox.com.br" },
];

async function login() {
  if (TOKEN_ENV) return TOKEN_ENV;
  if (!EMAIL || !PASSWORD) {
    throw new Error("Defina ADMIN_EMAIL + ADMIN_PASSWORD ou ADMIN_TOKEN");
  }
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

async function uploadPng(token, filePath) {
  const buf = fs.readFileSync(filePath);
  const presign = await fetch(`${API_BASE}/imagem/upload-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ contentType: "image/png", tamanhoBytes: buf.length }),
  });
  const presignData = await presign.json().catch(() => ({}));
  if (!presign.ok) {
    throw new Error(`Presign falhou (${presign.status}): ${JSON.stringify(presignData)}`);
  }
  const put = await fetch(presignData.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: buf,
  });
  if (!put.ok) {
    const text = await put.text().catch(() => "");
    throw new Error(`Upload S3 falhou (${put.status}): ${text.slice(0, 200)}`);
  }
  return presignData.urlPublica;
}

async function main() {
  console.log(`API: ${API_BASE}`);
  console.log(`Logos: ${FRONT_PARCEIROS}`);
  if (!fs.existsSync(FRONT_PARCEIROS)) {
    throw new Error(`Pasta de logos não encontrada: ${FRONT_PARCEIROS}`);
  }

  const token = await login();
  console.log("Login OK");

  const parceiros = [];
  for (let i = 0; i < PARCEIROS.length; i++) {
    const p = PARCEIROS[i];
    const filePath = path.join(FRONT_PARCEIROS, p.arquivo);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo ausente: ${filePath}`);
    }
    process.stdout.write(`[${i + 1}/${PARCEIROS.length}] ${p.nome}... `);
    const logoUrl = await uploadPng(token, filePath);
    console.log(logoUrl);
    parceiros.push({
      nome: p.nome,
      logoUrl,
      linkUrl: p.linkUrl,
      ordem: i + 1,
      ativo: true,
    });
  }

  const put = await fetch(`${API_BASE}/site/parceiros`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      cupomGlobal: "FUGUETE05",
      parceiros,
    }),
  });
  const putData = await put.json().catch(() => ({}));
  if (!put.ok) {
    throw new Error(`PUT /site/parceiros falhou (${put.status}): ${JSON.stringify(putData)}`);
  }
  console.log(`Parceiros salvos: ${putData.parceiros?.length ?? parceiros.length} | cupom=${putData.cupomGlobal}`);

  const get = await fetch(`${API_BASE}/site/parceiros`);
  const getData = await get.json();
  console.log(`GET /site/parceiros → ${getData.parceiros?.length ?? getData.itens?.length ?? 0} ativos`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
