/**
 * Preenche dataTorneio nos itens do Hall a partir do horário do torneio
 * (ordenação pública: mais recente → mais antigo).
 *
 * Uso:
 *   API_BASE=http://localhost:3000 \
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... \
 *   node scripts/backfillHallDataTorneio.mjs
 */
const API_BASE = (process.env.API_BASE || "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;
const TOKEN_ENV = process.env.ADMIN_TOKEN;

async function login() {
  if (TOKEN_ENV) return TOKEN_ENV;
  if (!EMAIL || !PASSWORD) throw new Error("Defina ADMIN_EMAIL + ADMIN_PASSWORD ou ADMIN_TOKEN");
  const res = await fetch(`${API_BASE}/usuario/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, senha: PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Login falhou: ${JSON.stringify(data)}`);
  return data.token || data.accessToken || data.jwt;
}

async function apiGet(pathUrl, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}${pathUrl}`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`GET ${pathUrl} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function apiPatch(pathUrl, token, body) {
  const res = await fetch(`${API_BASE}${pathUrl}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`PATCH ${pathUrl} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function listarHallCompleto() {
  const itens = [];
  let offset = 0;
  for (;;) {
    const data = await apiGet(`/hall-da-fama?limite=100&offset=${offset}`);
    itens.push(...(data.itens || []));
    if (offset + (data.itens?.length || 0) >= (data.total || 0) || !(data.itens || []).length) break;
    offset += 100;
  }
  return itens;
}

async function main() {
  console.log(`API: ${API_BASE}`);
  const token = await login();
  console.log("Login OK");

  const itens = await listarHallCompleto();
  console.log(`Itens no Hall: ${itens.length}`);

  let ok = 0;
  let erro = 0;

  for (const item of itens) {
    const label = `${item.torneioNome || item.torneioId} (${String(item.id).slice(0, 8)})`;
    try {
      const torneio = await apiGet(`/torneio/${encodeURIComponent(item.torneioId)}`, token);
      const horario = torneio?.horario || torneio?.torneio?.horario;
      if (!horario) throw new Error("torneio sem horario");
      const dataIso = new Date(horario).toISOString();
      await apiPatch(`/hall-da-fama/${encodeURIComponent(item.id)}`, token, {
        ativo: item.ativo !== false,
        dataTorneio: dataIso,
      });
      console.log(`${label} → ${dataIso}`);
      ok += 1;
    } catch (err) {
      console.error(`${label} → erro: ${err.message || err}`);
      erro += 1;
    }
  }

  const depois = await listarHallCompleto();
  console.log("\nOrdem após backfill (mais recente → mais antigo):");
  for (const item of depois.slice(0, 12)) {
    console.log(`  ${item.dataTorneio || item.criadoEm} | ${item.torneioNome}`);
  }
  console.log(`\nResumo: ok=${ok} erro=${erro}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
