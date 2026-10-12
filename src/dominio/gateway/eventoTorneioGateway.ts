export interface EventoTorneioGateway {
  publicar(nome: string, payload?: unknown): void;
}

/** Usado em testes e quando a composição não liga o publicador. */
export const eventoTorneioNulo: EventoTorneioGateway = {
  publicar() {},
};

let padrao: EventoTorneioGateway = eventoTorneioNulo;

export function definirEventoTorneioPadrao(gateway: EventoTorneioGateway): void {
  padrao = gateway;
}

/** Avaliado na chamada de criar(), depois que a infra registra o publicador. */
export function eventoTorneioPadrao(): EventoTorneioGateway {
  return padrao;
}
