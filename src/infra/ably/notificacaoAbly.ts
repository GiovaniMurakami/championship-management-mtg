import Ably from "ably";
import { eventosTorneio } from "../socketio/eventosTorneio";

// Canal por torneio: "torneio-{torneioId}"
// O cliente assina esse canal com ably-js

export class NotificacaoAbly {
  private ably: Ably.Rest;
  private static publicacoesPendentes = new Set<Promise<void>>();

  private constructor() {
    this.ably = new Ably.Rest(process.env.ABLY_API_KEY!);
    this.escutarEventos();
  }

  public static iniciar() {
    return new NotificacaoAbly();
  }

  public static async aguardarPublicacoesPendentes() {
    await Promise.allSettled(NotificacaoAbly.publicacoesPendentes);
  }

  private publicar(torneioId: string, evento: string, payload: unknown) {
    const canal = `torneio-${torneioId}`;
    const p: Promise<void> = this.ably.channels.get(canal).publish(evento, payload).then(() => undefined)
      .catch((err) => console.error(`[Ably] erro ao publicar ${evento} no canal ${canal}:`, err))
      .finally(() => NotificacaoAbly.publicacoesPendentes.delete(p));
    NotificacaoAbly.publicacoesPendentes.add(p);
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

    eventosTorneio.on("mesa_atualizada", (payload: Record<string, unknown> & { torneioId: string }) => {
      this.publicar(payload.torneioId, "mesa_atualizada", payload);
    });

    eventosTorneio.on("standings_atualizados", (payload: Record<string, unknown> & { torneioId: string }) => {
      this.publicar(payload.torneioId, "standings_atualizados", payload);
    });

    eventosTorneio.on("participante_inscrito", (payload: Record<string, unknown> & { torneioId: string }) => {
      this.publicar(payload.torneioId, "participante_inscrito", payload);
    });

    eventosTorneio.on("checkin_realizado", (payload: Record<string, unknown> & { torneioId: string }) => {
      this.publicar(payload.torneioId, "checkin_realizado", payload);
    });

    eventosTorneio.on("deck_inserido", (payload: Record<string, unknown> & { torneioId: string }) => {
      this.publicar(payload.torneioId, "deck_inserido", payload);
    });
  }
}
