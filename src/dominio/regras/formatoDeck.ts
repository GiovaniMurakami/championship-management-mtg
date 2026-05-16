import { Carta } from "../entidade/deck";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type RegraFormatoDeck = {
  chave: string;
  exigeCommander: boolean;
  minimoMaindeck?: number;
  maximoSideboard?: number;
  commander: {
    minEntradas?: number;
    maxEntradas?: number;
    totalCopiasExato?: number;
    quantidadePorCartaMin?: number;
    quantidadePorCartaMax?: number;
  };
};

const REGRA_PADRAO: RegraFormatoDeck = {
  chave: "default",
  exigeCommander: false,
  minimoMaindeck: 60,
  maximoSideboard: 15,
  commander: {},
};

const REGRAS_FORMATO: Record<string, RegraFormatoDeck> = {
  commander: {
    chave: "commander",
    exigeCommander: true,
    minimoMaindeck: 99,
    maximoSideboard: 15,
    commander: {
      minEntradas: 1,
      maxEntradas: 1,
      totalCopiasExato: 1,
      quantidadePorCartaMin: 1,
      quantidadePorCartaMax: 1,
    },
  },
  commander500: {
    chave: "commander500",
    exigeCommander: true,
    minimoMaindeck: 99,
    maximoSideboard: 15,
    commander: {
      minEntradas: 1,
      maxEntradas: 1,
      totalCopiasExato: 1,
      quantidadePorCartaMin: 1,
      quantidadePorCartaMax: 1,
    },
  },
  "commander 500": {
    chave: "commander500",
    exigeCommander: true,
    minimoMaindeck: 99,
    maximoSideboard: 15,
    commander: {
      minEntradas: 1,
      maxEntradas: 1,
      totalCopiasExato: 1,
      quantidadePorCartaMin: 1,
      quantidadePorCartaMax: 1,
    },
  },
};

function totalCartas(cartas: Carta[]): number {
  return cartas.reduce((acc, carta) => acc + carta.quantidade, 0);
}

export function normalizarListaCartas(cartas: Carta[] = []): Carta[] {
  return cartas.map((carta) => ({
    nome: carta.nome.toLowerCase().trim(),
    quantidade: carta.quantidade,
  }));
}

export function normalizarFormatoDeck(formato: string): string {
  const formatoNormalizado = formato.toLowerCase().trim().replace(/\s+/g, " ");
  if (formatoNormalizado === "commander 500") return "commander500";
  return formatoNormalizado;
}

export function normalizarLinkLigaMagic(linkLigaMagic?: string | null): string | null {
  if (linkLigaMagic === undefined || linkLigaMagic === null) return null;

  const linkNormalizado = linkLigaMagic.trim();
  return linkNormalizado.length > 0 ? linkNormalizado : null;
}

export function validarLinkLigaMagic(formato: string, linkLigaMagic?: string | null): void {
  const formatoNormalizado = normalizarFormatoDeck(formato);
  const linkNormalizado = normalizarLinkLigaMagic(linkLigaMagic);

  if (formatoNormalizado !== "commander500") {
    return;
  }

  if (!linkNormalizado) {
    throw ErroPersonalizado.criar({
      mensagem: "linkLigaMagic é obrigatório para o formato commander500.",
      status: StatusErro.erroParametro,
    });
  }

  try {
    new URL(linkNormalizado);
  } catch {
    throw ErroPersonalizado.criar({
      mensagem: "linkLigaMagic deve ser uma URL válida para o formato commander500.",
      status: StatusErro.erroParametro,
    });
  }
}

export function obterRegraFormatoDeck(formato: string): RegraFormatoDeck {
  return REGRAS_FORMATO[normalizarFormatoDeck(formato)] ?? REGRA_PADRAO;
}

export function validarDeckPorFormato(params: {
  formato: string;
  maindeck: Carta[];
  sideboard?: Carta[] | null;
  commander?: Carta[] | null;
}): void {
  const formato = normalizarFormatoDeck(params.formato);
  const regra = obterRegraFormatoDeck(formato);
  const maindeck = params.maindeck ?? [];
  const sideboard = params.sideboard ?? [];
  const commander = params.commander ?? [];

  if (regra.minimoMaindeck !== undefined) {
    const totalMaindeck = totalCartas(maindeck);
    if (totalMaindeck < regra.minimoMaindeck) {
      throw ErroPersonalizado.criar({
        mensagem: `O maindeck precisa ter no mínimo ${regra.minimoMaindeck} cartas para o formato ${formato}. Atual: ${totalMaindeck}.`,
        status: StatusErro.erroParametro,
      });
    }
  }

  if (regra.maximoSideboard !== undefined) {
    const totalSideboard = totalCartas(sideboard);
    if (totalSideboard > regra.maximoSideboard) {
      throw ErroPersonalizado.criar({
        mensagem: `O sideboard pode ter no máximo ${regra.maximoSideboard} cartas para o formato ${formato}. Atual: ${totalSideboard}.`,
        status: StatusErro.erroParametro,
      });
    }
  }

  if (!regra.exigeCommander) {
    return;
  }

  if (commander.length === 0) {
    throw ErroPersonalizado.criar({
      mensagem: `O formato ${formato} exige commander explícito.`,
      status: StatusErro.erroParametro,
    });
  }

  if (regra.commander.minEntradas !== undefined && commander.length < regra.commander.minEntradas) {
    throw ErroPersonalizado.criar({
      mensagem: `O campo commander precisa ter ao menos ${regra.commander.minEntradas} carta(s) para o formato ${formato}.`,
      status: StatusErro.erroParametro,
    });
  }

  if (regra.commander.maxEntradas !== undefined && commander.length > regra.commander.maxEntradas) {
    throw ErroPersonalizado.criar({
      mensagem: `O campo commander pode ter no máximo ${regra.commander.maxEntradas} carta(s) para o formato ${formato}.`,
      status: StatusErro.erroParametro,
    });
  }

  if (regra.commander.totalCopiasExato !== undefined) {
    const totalCommander = totalCartas(commander);
    if (totalCommander !== regra.commander.totalCopiasExato) {
      throw ErroPersonalizado.criar({
        mensagem: `O campo commander deve totalizar exatamente ${regra.commander.totalCopiasExato} carta(s) para o formato ${formato}. Atual: ${totalCommander}.`,
        status: StatusErro.erroParametro,
      });
    }
  }

  for (const carta of commander) {
    if (
      regra.commander.quantidadePorCartaMin !== undefined &&
      carta.quantidade < regra.commander.quantidadePorCartaMin
    ) {
      throw ErroPersonalizado.criar({
        mensagem: `A carta "${carta.nome}" em commander precisa ter quantidade mínima ${regra.commander.quantidadePorCartaMin} para o formato ${formato}.`,
        status: StatusErro.erroParametro,
      });
    }
    if (
      regra.commander.quantidadePorCartaMax !== undefined &&
      carta.quantidade > regra.commander.quantidadePorCartaMax
    ) {
      throw ErroPersonalizado.criar({
        mensagem: `A carta "${carta.nome}" em commander pode ter quantidade máxima ${regra.commander.quantidadePorCartaMax} para o formato ${formato}.`,
        status: StatusErro.erroParametro,
      });
    }
  }
}
