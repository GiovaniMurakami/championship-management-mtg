import { Carta } from "../entidade/deck";

export interface ChatGptGateway {
  obterNomeConsolidado(
    maindeck: Carta[],
    sideboard: Carta[],
    commander: Carta[],
    formato: string
  ): Promise<string | null>;
}
