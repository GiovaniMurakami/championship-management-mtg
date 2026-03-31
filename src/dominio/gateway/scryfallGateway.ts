export type CartaScryfall = {
  nome: string;
  nomeIngles: string;
  imageUrl: string | null;
  tipo: string;
  raridade: string;
  cmc: number;
  colors: string[];
  legalities: Record<string, string>;
};

export type ResultadoValidarDecklist = {
  validas: string[];
  invalidas: string[];
  valida: boolean;
};

export interface ScryfallGateway {
  buscarCarta(nome: string): Promise<CartaScryfall | null>;
  autocompletar(q: string): Promise<string[]>;
  validarDecklist(cartas: string[], formato?: string): Promise<ResultadoValidarDecklist>;
}
