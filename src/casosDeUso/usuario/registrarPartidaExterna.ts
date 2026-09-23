import { v4 as uuid } from "uuid";
import { z } from "zod";
import { PartidaExternaGateway } from "../../dominio/gateway/partidaExternaGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";

export const partidaExternaSchema = z.object({
  resultado: z.enum(["vitoria", "derrota", "empate"]),
  data: z.iso.date().refine((data) => data <= new Date().toISOString().slice(0, 10), "A data não pode estar no futuro."),
  deckNome: z.string().trim().min(1).max(100).optional(),
  deckAdversarioNome: z.string().trim().min(1).max(100).optional(),
  campeonato: z.string().trim().max(150).optional(),
  oponente: z.string().trim().max(100).optional(),
});

export class RegistrarPartidaExterna {
  private constructor(private readonly partidas: PartidaExternaGateway, private readonly usuarios: UsuarioGateway) {}
  public static criar(partidas: PartidaExternaGateway, usuarios: UsuarioGateway) { return new RegistrarPartidaExterna(partidas, usuarios); }
  public async executar(usuarioId: string, input: unknown) {
    const usuario = await this.usuarios.buscarPorId(usuarioId);
    if (!usuario || usuario.excluido) throw ErroPersonalizado.criar({ mensagem: "Usuário não encontrado", status: 404 });
    const dados = partidaExternaSchema.safeParse(input);
    if (!dados.success) throw ErroPersonalizado.criar({ mensagem: "Informe um resultado e uma data válidos.", status: 400 });
    const partida = { ...dados.data, id: uuid(), usuarioId, criadoEm: new Date().toISOString() };
    await this.partidas.salvar(partida);
    return partida;
  }
}
