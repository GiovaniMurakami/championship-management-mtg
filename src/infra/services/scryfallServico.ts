import { CartaScryfall, ResultadoValidarDecklist, ScryfallGateway } from "../../dominio/gateway/scryfallGateway";
import { logger } from "../../helpers/logger";

const BASE_URL = "https://api.scryfall.com";

export class ScryfallServico implements ScryfallGateway {
  private constructor() {}

  public static criar() {
    return new ScryfallServico();
  }

  public async buscarCarta(nome: string): Promise<CartaScryfall | null> {
    try {
      const url = `${BASE_URL}/cards/named?fuzzy=${encodeURIComponent(nome)}`;
      const response = await fetch(url, {
        headers: { "User-Agent": "championship-management-mtg/1.0" },
      });

      if (response.status === 404) return null;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as Record<string, unknown>;
      return this.mapearCarta(data);
    } catch (err) {
      logger.error({ err, nome }, "[ScryfallServico] erro ao buscar carta");
      return null;
    }
  }

  public async autocompletar(q: string): Promise<string[]> {
    try {
      const url = `${BASE_URL}/cards/autocomplete?q=${encodeURIComponent(q)}`;
      const response = await fetch(url, {
        headers: { "User-Agent": "championship-management-mtg/1.0" },
      });

      if (!response.ok) return [];

      const data = await response.json() as { data?: string[] };
      return data.data ?? [];
    } catch (err) {
      logger.error({ err, q }, "[ScryfallServico] erro ao autocompletar");
      return [];
    }
  }

  public async validarDecklist(cartas: string[], formato?: string): Promise<ResultadoValidarDecklist> {
    const nomeUnicos = [...new Set(cartas)];

    const resultados = await Promise.allSettled(
      nomeUnicos.map(async (nome) => {
        const url = `${BASE_URL}/cards/named?exact=${encodeURIComponent(nome)}`;
        const response = await fetch(url, {
          headers: { "User-Agent": "championship-management-mtg/1.0" },
        });

        if (response.status === 404) return { nome, valida: false };

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        if (formato) {
          const data = await response.json() as { legalities?: Record<string, string> };
          const legalidade = data.legalities?.[formato.toLowerCase()];
          return { nome, valida: legalidade === "legal" };
        }

        return { nome, valida: true };
      })
    );

    const validas: string[] = [];
    const invalidas: string[] = [];

    for (const resultado of resultados) {
      if (resultado.status === "fulfilled") {
        if (resultado.value.valida) {
          validas.push(resultado.value.nome);
        } else {
          invalidas.push(resultado.value.nome);
        }
      } else {
        logger.error({ err: resultado.reason }, "[ScryfallServico] erro ao validar carta");
      }
    }

    return { validas, invalidas, valida: invalidas.length === 0 };
  }

  private mapearCarta(data: Record<string, unknown>): CartaScryfall {
    const imageUris = data.image_uris as Record<string, string> | undefined;
    const cardFaces = data.card_faces as Array<{ image_uris?: Record<string, string> }> | undefined;
    const imageUrl =
      imageUris?.normal ??
      cardFaces?.[0]?.image_uris?.normal ??
      null;

    return {
      nome: (data.printed_name as string) ?? (data.name as string),
      nomeIngles: data.name as string,
      imageUrl,
      tipo: data.type_line as string,
      raridade: data.rarity as string,
      cmc: (data.cmc as number) ?? 0,
      colors: (data.colors as string[]) ?? [],
      legalities: (data.legalities as Record<string, string>) ?? {},
    };
  }
}
