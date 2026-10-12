import { EventoTorneioGateway, eventoTorneioPadrao } from "../../dominio/gateway/eventoTorneioGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type DefinirAnfitriaoTorneioInputDto = {
  torneioId: string;
  anfitriaoId: string | null;
};

export type DefinirAnfitriaoTorneioOutputDto = {
  id: string;
  anfitriaoId: string | null;
  anfitriao?: {
    id: string;
    nome: string;
    email: string;
  } | null;
};

export class DefinirAnfitriaoTorneio
  implements CasoDeUso<DefinirAnfitriaoTorneioInputDto, DefinirAnfitriaoTorneioOutputDto> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly usuarioGateway: UsuarioGateway,
    private readonly eventos: EventoTorneioGateway,
    ) { }

  public static criar(torneioGateway: TorneioGateway, usuarioGateway: UsuarioGateway,
    eventos: EventoTorneioGateway = eventoTorneioPadrao()) {
    return new DefinirAnfitriaoTorneio(torneioGateway, usuarioGateway, eventos);
  }

  public async executar(
    input: DefinirAnfitriaoTorneioInputDto
  ): Promise<DefinirAnfitriaoTorneioOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);

    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (input.anfitriaoId) {
      const usuario = await this.usuarioGateway.buscarPorId(input.anfitriaoId);
      if (!usuario) {
        throw ErroPersonalizado.criar({
          mensagem: "Usuário anfitrião não encontrado.",
          status: StatusErro.erroNaoEncontrado,
        });
      }
      torneio.anfitriaoId = usuario.id;
      await this.torneioGateway.atualizar(torneio);
      this.eventos.publicar("torneio_atualizado", { torneioId: torneio.id });
      return {
        id: torneio.id,
        anfitriaoId: usuario.id,
        anfitriao: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
        },
      };
    }

    torneio.anfitriaoId = null;
    await this.torneioGateway.atualizar(torneio);
      this.eventos.publicar("torneio_atualizado", { torneioId: torneio.id });

    return {
      id: torneio.id,
      anfitriaoId: null,
      anfitriao: null,
    };
  }
}
