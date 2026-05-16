import { Carta } from "../../dominio/entidade/deck";
import { ChatGptGateway } from "../../dominio/gateway/chatGptGateway";
import { logger } from "../../helpers/logger";
import { comRetry } from "../../helpers/retry";

const TENTATIVAS = 3;
const DELAY_INICIAL_MS = 500;
const TIMEOUT_MS = 3500;

class ChatGptHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export class ChatGptServico implements ChatGptGateway {
  private constructor(private readonly apiKey: string) { }

  public static criar() {
    return new ChatGptServico(process.env.CHATGPT_API_KEY ?? "");
  }

  public async obterNomeConsolidado(
    maindeck: Carta[],
    sideboard: Carta[],
    commander: Carta[],
    formato: string
  ): Promise<string | null> {
    if (!this.apiKey) return null;

    const listaMain = maindeck
      .map((c) => `${c.quantidade}x ${c.nome}`)
      .join("\n");
    const listaSide =
      sideboard.length > 0
        ? `\nSideboard:\n${sideboard.map((c) => `${c.quantidade}x ${c.nome}`).join("\n")}`
        : "";
    const listaCommander =
      commander.length > 0
        ? `\nCommander:\n${commander.map((c) => `${c.quantidade}x ${c.nome}`).join("\n")}`
        : "";

    const prompt =
      `VocÃª Ã© um especialista em Magic: The Gathering. Analise a lista de deck abaixo no formato "${formato}" ` +
      `e retorne APENAS um JSON vÃ¡lido com a chave "nomeConsolidado" contendo o nome de arquÃ©tipo mais ` +
      `conhecido para esse deck, conforme os nomes utilizados em sites como MTGGoldfish, MTGTop8 e EDHREC ` +
      `Priorize o nome exato como aparece nos metagame reports do MTGGoldfish para o formato "${formato}".\n\n` +
      `Maindeck:\n${listaMain}${listaSide}${listaCommander}\n\n` +
      `Responda apenas com JSON vÃ¡lido, sem texto adicional. Exemplo: {"nomeConsolidado": "Monored Burn"}`;

    try {
      return await comRetry(
        () => this.chamarApi(prompt),
        TENTATIVAS,
        DELAY_INICIAL_MS,
        (err) => {
          if (err instanceof ChatGptHttpError) {
            return err.status === 429 || err.status >= 500;
          }
          return true;
        }
      );
    } catch (err) {
      logger.error({ err }, "[ChatGptServico] falhou apÃ³s todas as tentativas");
      return null;
    }
  }

  private async chamarApi(prompt: string): Promise<string | null> {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), TIMEOUT_MS);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 50,
      }),
      signal: abortController.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new ChatGptHttpError(response.status, `HTTP ${response.status}: ${errBody}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as { nomeConsolidado?: string };
    return parsed.nomeConsolidado ?? null;
  }
}
