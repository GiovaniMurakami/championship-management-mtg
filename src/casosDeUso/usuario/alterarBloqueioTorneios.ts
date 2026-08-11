import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { eventosTorneio } from "../../infra/socketio/eventosTorneio";

export type AlterarBloqueioTorneiosInputDto = {
  usuarioId: string;
  bloqueado: boolean;
};

export type AlterarBloqueioTorneiosOutputDto = {
  id: string;
  nome: string;
  email: string;
  bloqueadoTorneios: boolean;
  inscricoesRemovidas: number;
};

export class AlterarBloqueioTorneios
  implements CasoDeUso<AlterarBloqueioTorneiosInputDto, AlterarBloqueioTorneiosOutputDto> {
  private constructor(
    private readonly usuarioGateway: UsuarioGateway,
    private readonly inscricaoGateway: InscricaoGateway,
    private readonly torneioGateway: TorneioGateway,
  ) {}

  public static criar(
    usuarioGateway: UsuarioGateway,
    inscricaoGateway: InscricaoGateway,
    torneioGateway: TorneioGateway,
  ) {
    return new AlterarBloqueioTorneios(usuarioGateway, inscricaoGateway, torneioGateway);
  }

  public async executar(
    input: AlterarBloqueioTorneiosInputDto,
  ): Promise<AlterarBloqueioTorneiosOutputDto> {
    const usuario = await this.usuarioGateway.buscarPorId(input.usuarioId);
    if (!usuario) {
      throw ErroPersonalizado.criar({
        mensagem: "Usuário não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (input.bloqueado && usuario.role === "admin") {
      throw ErroPersonalizado.criar({
        mensagem: "Não é possível bloquear um administrador.",
        status: StatusErro.erroProibido,
      });
    }

    let inscricoesRemovidas = 0;

    if (input.bloqueado) {
      const inscricoes = await this.inscricaoGateway.listarPorUsuario(usuario.id);
      if (inscricoes.length > 0) {
        const torneioIds = Array.from(new Set(inscricoes.map((i) => i.torneioId)));
        const torneios = await Promise.all(
          torneioIds.map((id) => this.torneioGateway.buscarPorId(id)),
        );
        const abertos = new Set(
          torneios
            .filter((t) => t?.status === "inscricoes_abertas")
            .map((t) => t!.id),
        );

        for (const inscricao of inscricoes) {
          if (!abertos.has(inscricao.torneioId)) continue;
          await this.inscricaoGateway.excluir(inscricao.id);
          inscricoesRemovidas += 1;
          eventosTorneio.emit("jogador_dropou", {
            torneioId: inscricao.torneioId,
            jogadorId: usuario.id,
            jogadorNome: usuario.nome,
            inscricaoRemovida: true,
            partidasResolvidas: [],
          });
        }
      }
    }

    usuario.bloqueadoTorneios = input.bloqueado;
    await this.usuarioGateway.atualizar(usuario);

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      bloqueadoTorneios: usuario.bloqueadoTorneios,
      inscricoesRemovidas,
    };
  }
}
