import { Carta } from "../entidade/deck";

export interface ChatGptGateway {
  obterNomeConsolidado(
    maindeck: Carta[],
    sideboard: Carta[],
    formato: string
  ): Promise<string | null>;
}
