import { Carta } from "../../dominio/entidade/deck";
import { ChatGptGateway } from "../../dominio/gateway/chatGptGateway";

export class ChatGptServico implements ChatGptGateway {
  private constructor(private readonly apiKey: string) {}

  public static criar() {
    return new ChatGptServico(process.env.CHATGPT_API_KEY ?? "");
  }

  public async obterNomeConsolidado(
    maindeck: Carta[],
    sideboard: Carta[],
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

    const prompt =
      `Você é um especialista em Magic: The Gathering. Analise a lista de deck abaixo no formato "${formato}" ` +
      `e retorne APENAS um JSON válido com a chave "nomeConsolidado" contendo o nome de arquétipo mais ` +
      `conhecido para esse deck (ex: "Burn", "Storm", "Merfolk", "Temur Rhinos", "Mono Red Aggro", etc).\n\n` +
      `Maindeck:\n${listaMain}${listaSide}\n\n` +
      `Responda apenas com JSON válido, sem texto adicional. Exemplo: {"nomeConsolidado": "Burn"}`;

    try {
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
      });

      if (!response.ok) return null;

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      const parsed = JSON.parse(content) as { nomeConsolidado?: string };
      return parsed.nomeConsolidado ?? null;
    } catch {
      return null;
    }
  }
}
