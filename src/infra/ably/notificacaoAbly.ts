import Ably from "ably";
import { eventosTorneio } from "../socketio/eventosTorneio";

// Canal por torneio: "torneio-{torneioId}"
// O cliente assina esse canal com ably-js

export class NotificacaoAbly {
  private ably: Ably.Rest;

  private constructor() {
    this.ably = new Ably.Rest(process.env.ABLY_API_KEY!);
    this.escutarEventos();
  }

  public static iniciar() {
    return new NotificacaoAbly();
  }

  private publicar(torneioId: string, evento: string, payload: unknown) {
    this.ably.channels.get(`torneio-${torneioId}`).publish(evento, payload)
      .catch((err) => console.error(`[Ably] erro ao publicar ${evento}:`, err));
  }

  private escutarEventos() {
    eventosTorneio.on("rodada_iniciada", (payload: Record<string, unknown> & { torneioId: string }) => {
      this.publicar(payload.torneioId, "rodada_iniciada", payload);
    });

    eventosTorneio.on("torneio_finalizado", (payload: Record<string, unknown> & { torneioId: string }) => {
      this.publicar(payload.torneioId, "torneio_finalizado", payload);
    });

    eventosTorneio.on("resultado_registrado", (payload: Record<string, unknown> & { torneioId: string }) => {
      this.publicar(payload.torneioId, "resultado_registrado", payload);
    });

    eventosTorneio.on("standings_atualizados", (payload: Record<string, unknown> & { torneioId: string }) => {
      this.publicar(payload.torneioId, "standings_atualizados", payload);
    });
  }
}
