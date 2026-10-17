/**
 * Integração in-memory: Hall da Fama (ordenação por data) + textos de parceiros.
 */

import { HallTop8 } from "../../src/dominio/entidade/hallTop8";
import { HallTop8Gateway, HallTop8Item } from "../../src/dominio/gateway/hallTop8Gateway";
import { ParceirosSiteConfig, SiteConfigGateway } from "../../src/dominio/gateway/siteConfigGateway";
import { CadastrarHallTop8 } from "../../src/casosDeUso/hall/cadastrarHallTop8";
import { ListarHallTop8 } from "../../src/casosDeUso/hall/listarHallTop8";
import { AtualizarHallTop8 } from "../../src/casosDeUso/hall/atualizarHallTop8";
import { BuscarParceiros } from "../../src/casosDeUso/site/buscarParceiros";
import { SalvarParceiros } from "../../src/casosDeUso/site/salvarParceiros";

function criarHallMemoria(): HallTop8Gateway {
  const store = new Map<string, HallTop8Item>();
  return {
    salvar: async (item) => {
      store.set(item.id, { ...item });
    },
    listar: async () =>
      Array.from(store.values()).sort(
        (a, b) =>
          b.dataTorneio.getTime() - a.dataTorneio.getTime()
          || b.criadoEm.getTime() - a.criadoEm.getTime()
          || a.id.localeCompare(b.id),
      ),
    buscarPorId: async (id) => store.get(id) ?? null,
    excluir: async (id) => store.delete(id),
  };
}

function criarSiteConfigMemoria(): SiteConfigGateway {
  let parceiros: ParceirosSiteConfig | null = null;
  return {
    buscarAnuncios: vi.fn().mockResolvedValue(null),
    salvarAnuncios: vi.fn(async (c) => c),
    registrarCliqueAnuncio: vi.fn().mockResolvedValue(null),
    buscarAnuncioDiario: vi.fn().mockResolvedValue(null),
    salvarAnuncioDiario: vi.fn(async (c) => c),
    registrarVisualizacaoAnuncioDiario: vi.fn().mockResolvedValue(null),
    registrarCliqueAnuncioDiario: vi.fn().mockResolvedValue(null),
    buscarMetagameOverrides: vi.fn().mockResolvedValue(null),
    salvarMetagameOverrides: vi.fn(async (c) => c),
    buscarSlidesHome: vi.fn().mockResolvedValue(null),
    salvarSlidesHome: vi.fn(async (c) => c),
    buscarParceiros: async () => parceiros,
    salvarParceiros: async (config) => {
      parceiros = { ...config };
      return parceiros;
    },
    buscarConteudoHome: vi.fn().mockResolvedValue(null),
    salvarConteudoHome: vi.fn(async (c) => c),
    buscarSobreMim: vi.fn().mockResolvedValue(null),
    salvarSobreMim: vi.fn(async (c) => c),
  };
}

describe("Integração Hall da Fama + Parceiros", () => {
  it("lista Hall do mais recente para o mais antigo após cadastrar e backfill de data", async () => {
    const hall = criarHallMemoria();
    const torneios = new Map([
      [
        "550e8400-e29b-41d4-a716-446655440001",
        { id: "550e8400-e29b-41d4-a716-446655440001", nome: "League 294", horario: new Date("2026-10-07T23:00:00.000Z") },
      ],
      [
        "550e8400-e29b-41d4-a716-446655440002",
        { id: "550e8400-e29b-41d4-a716-446655440002", nome: "Champ 311", horario: new Date("2026-10-05T23:00:00.000Z") },
      ],
      [
        "550e8400-e29b-41d4-a716-446655440003",
        { id: "550e8400-e29b-41d4-a716-446655440003", nome: "Tropical 300", horario: new Date("2026-10-03T13:00:00.000Z") },
      ],
    ]);
    const torneioGateway = {
      buscarPorId: async (id: string) => torneios.get(id) ?? null,
    };

    const cadastrar = CadastrarHallTop8.criar(hall, torneioGateway as never);
    const antigo = await cadastrar.executar({
      torneioId: "550e8400-e29b-41d4-a716-446655440003",
      imagemUrl: "https://bucket.s3.amazonaws.com/imagens/a.webp",
    });
    const medio = await cadastrar.executar({
      torneioId: "550e8400-e29b-41d4-a716-446655440002",
      imagemUrl: "https://bucket.s3.amazonaws.com/imagens/b.webp",
    });
    const recente = await cadastrar.executar({
      torneioId: "550e8400-e29b-41d4-a716-446655440001",
      imagemUrl: "https://bucket.s3.amazonaws.com/imagens/c.webp",
    });

    // Simula item antigo sem dataTorneio correta (só criadoEm) e corrige via PATCH
    const itemAntigo = await hall.buscarPorId(antigo.id);
    expect(itemAntigo).toBeTruthy();
    await AtualizarHallTop8.criar(hall).executar({
      id: antigo.id,
      dataTorneio: "2026-10-03T13:00:00.000Z",
    });

    const lista = await ListarHallTop8.criar(hall).executar({ limite: 10, offset: 0 });
    expect(lista.itens.map((i: { id: string }) => i.id)).toEqual([
      recente.id,
      medio.id,
      antigo.id,
    ]);
    expect(lista.itens.map((i: { torneioNome: string }) => i.torneioNome)).toEqual([
      "League 294",
      "Champ 311",
      "Tropical 300",
    ]);
  });

  it("persiste textos de /parceiros e devolve no GET público", async () => {
    const site = criarSiteConfigMemoria();

    await SalvarParceiros.criar(site).executar({
      parceiros: [
        {
          nome: "Loja Alpha",
          logoUrl: "https://cdn.example/alpha.webp",
          linkUrl: "https://alpha.example",
          ativo: true,
        },
      ],
      cupomGlobal: "FUGUETE05",
      paginaTitulo: "Temos o orgulho de ser parceiros",
      paginaTexto: "Reconhecimento da comunidade.",
      ctaTitulo: "Ainda não é parceiro?",
      ctaTexto: "Entre em contato.",
      contatoEmail: "contato@tiagofuguete.com.br",
    });

    const publico = await BuscarParceiros.criar(site).executar();
    expect(publico.parceiros).toHaveLength(1);
    expect(publico.parceiros[0].nome).toBe("Loja Alpha");
    expect(publico.paginaTitulo).toBe("Temos o orgulho de ser parceiros");
    expect(publico.paginaTexto).toBe("Reconhecimento da comunidade.");
    expect(publico.ctaTitulo).toBe("Ainda não é parceiro?");
    expect(publico.contatoEmail).toBe("contato@tiagofuguete.com.br");
    expect(publico.cupomGlobal).toBe("FUGUETE05");
  });

  it("entidade HallTop8 usa dataTorneio com fallback em criadoEm", () => {
    const criadoEm = new Date("2026-01-01T00:00:00.000Z");
    const semData = new HallTop8({
      id: "550e8400-e29b-41d4-a716-446655440099",
      torneioId: "550e8400-e29b-41d4-a716-446655440098",
      imagemUrl: "https://bucket.s3.amazonaws.com/imagens/x.webp",
      criadoEm,
    });
    expect(semData.dataTorneio.getTime()).toBe(criadoEm.getTime());
  });
});
