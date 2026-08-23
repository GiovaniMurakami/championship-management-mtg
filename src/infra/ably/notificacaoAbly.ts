import Ably from "ably";
import { eventosTorneio } from "../socketio/eventosTorneio";
import { eventosRanqueada } from "../socketio/eventosRanqueada";
import { logger } from "../../helpers/logger";
import { comRetry } from "../../helpers/retry";

const TENTATIVAS = 3;
const DELAY_INICIAL_MS = 200;

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
    this.publicarNoCanal(`torneio-${torneioId}`, evento, payload);
  }

  private publicarNoCanal(canal: string, evento: string, payload: unknown) {
    const p: Promise<void> = comRetry(
      () => this.ably.channels.get(canal).publish(evento, payload).then(() => undefined),
      TENTATIVAS,
      DELAY_INICIAL_MS
    )
      .catch((err) =>
        logger.error({ err, canal, evento }, "[Ably] falhou após todas as tentativas")
      )
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

    eventosTorneio.on("resultado_contestado", (payload: Record<string, unknown> & { torneioId: string }) => {
      this.publicar(payload.torneioId, "resultado_contestado", payload);
    });

    eventosTorneio.on("resultado_confirmado", (payload: Record<string, unknown> & { torneioId: string }) => {
      this.publicar(payload.torneioId, "resultado_confirmado", payload);
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

    eventosTorneio.on("jogador_dropou", (payload: Record<string, unknown> & { torneioId: string }) => {
      this.publicar(payload.torneioId, "jogador_dropou", payload);
    });

    eventosTorneio.on("resultado_ajustado", (payload: Record<string, unknown> & { torneioId: string }) => {
      this.publicar(payload.torneioId, "resultado_ajustado", payload);
    });

    eventosTorneio.on("corte_iniciado", (payload: Record<string, unknown> & { torneioId: string }) => {
      this.publicar(payload.torneioId, "corte_iniciado", payload);
    });

    eventosTorneio.on("jogador_ingressou", (payload: Record<string, unknown> & { torneioId: string }) => {
      this.publicar(payload.torneioId, "jogador_ingressou", payload);
    });

    eventosTorneio.on("torneio_iniciado", (payload: Record<string, unknown> & { torneioId: string }) => {
      this.publicar(payload.torneioId, "torneio_iniciado", payload);
    });

    eventosTorneio.on("total_rodadas_alterado", (payload: Record<string, unknown> & { torneioId: string }) => {
      this.publicar(payload.torneioId, "total_rodadas_alterado", payload);
    });

    for (const evento of ["fila_atualizada", "partida_encontrada", "resultado_reportado", "resultado_contestado", "resultado_confirmado", "punicao_atualizada"]) {
      eventosRanqueada.on(evento, (payload: Record<string, unknown> & { jogadorId: string }) => {
        this.publicarNoCanal(`ranqueada-jogador-${payload.jogadorId}`, evento, payload);
      });
    }
    eventosRanqueada.on("contestacao_atualizada", (payload: Record<string, unknown>) => {
      this.publicarNoCanal("ranqueada-admin", "contestacao_atualizada", payload);
    });
  }
}
