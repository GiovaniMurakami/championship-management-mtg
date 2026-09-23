import { eventosTorneio } from "../../../src/infra/socketio/eventosTorneio";
import { NotificacaoAbly } from "../../../src/infra/ably/notificacaoAbly";
const publish = vi.fn().mockResolvedValue(undefined);
const get = vi.fn(() => ({ publish }));
vi.mock("ably", () => ({ __esModule: true, default: { Rest: vi.fn(() => ({ channels: { get } })) } }));
describe("encaminhamento dos eventos do torneio", () => {
  beforeEach(() => { eventosTorneio.removeAllListeners(); NotificacaoAbly.iniciar(); });
  afterEach(() => eventosTorneio.removeAllListeners());
  it.each([
    ["rodada_refeita", "rodada_refeita"],
    ["jogador_voltou", "jogador_voltou"],
    ["torneio_atualizado", "torneio_atualizado"],
    ["torneio_alterado", "torneio_atualizado"],
  ])("publica %s como %s uma única vez", async (origem, destino) => {
    const payload = { torneioId: "t1" };
    eventosTorneio.emit(origem, payload);
    await NotificacaoAbly.aguardarPublicacoesPendentes();
    expect(get).toHaveBeenCalledWith("torneio-t1");
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(destino, payload);
  });
});
