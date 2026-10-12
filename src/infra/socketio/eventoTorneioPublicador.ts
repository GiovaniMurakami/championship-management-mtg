import { definirEventoTorneioPadrao, EventoTorneioGateway } from "../../dominio/gateway/eventoTorneioGateway";
import { eventosTorneio } from "./eventosTorneio";

/** Publica no mesmo EventEmitter que a infra (Ably e invalidação de cache) já escuta. */
export class EventoTorneioPublicador implements EventoTorneioGateway {
  public publicar(nome: string, payload?: unknown): void {
    eventosTorneio.emit(nome, payload);
  }
}

definirEventoTorneioPadrao(new EventoTorneioPublicador());
