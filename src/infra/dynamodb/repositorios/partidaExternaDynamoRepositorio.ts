import { PartidaExterna, PartidaExternaGateway } from "../../../dominio/gateway/partidaExternaGateway";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

export class PartidaExternaDynamoRepositorio extends BaseDynamoRepositorio implements PartidaExternaGateway {
  public static criar() { return new PartidaExternaDynamoRepositorio(); }
  public async salvar(partida: PartidaExterna): Promise<void> {
    await this.putJson(`PARTIDAS_EXTERNAS#${partida.usuarioId}`, partida.id, partida);
  }
  public listarPorUsuario(usuarioId: string): Promise<PartidaExterna[]> {
    return this.queryJson(`PARTIDAS_EXTERNAS#${usuarioId}`);
  }
}
