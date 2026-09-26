import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { RoleUsuario } from "../../dominio/entidade/usuario";
import { CasoDeUso } from "../casoDeUso";
import { normalizarPaginacaoOffset } from "../../helpers/paginacao";

const LIMITE_MAXIMO_USUARIOS = 100;
const LIMITE_PADRAO_USUARIOS = 20;

export type ListarUsuariosInputDto = {
  nome?: string;
  role?: RoleUsuario;
  bloqueadoTorneios?: boolean;
  limite?: number;
  offset?: number;
};

export type ListarUsuariosOutputDto = {
  usuarios: Array<{
    id: string;
    nome: string;
    email: string;
    role: string;
    nickMTGO?: string;
    nickArena?: string;
    bloqueadoTorneios: boolean;
  }>;
  total: number;
  limite: number;
  offset: number;
};

export class ListarUsuarios
  implements CasoDeUso<ListarUsuariosInputDto, ListarUsuariosOutputDto> {
  private constructor(private readonly usuarioGateway: UsuarioGateway) { }

  public static criar(usuarioGateway: UsuarioGateway) {
    return new ListarUsuarios(usuarioGateway);
  }

  public async executar(input: ListarUsuariosInputDto): Promise<ListarUsuariosOutputDto> {
    const { limite, offset } = normalizarPaginacaoOffset(
      input.limite,
      input.offset,
      LIMITE_PADRAO_USUARIOS,
      LIMITE_MAXIMO_USUARIOS
    );

    const filtros = {
      nome: input.nome?.trim() || undefined,
      role: input.role,
      bloqueadoTorneios: input.bloqueadoTorneios,
      limite,
      offset,
    };

    const [usuarios, total] = await Promise.all([
      this.usuarioGateway.listar(filtros),
      this.usuarioGateway.listarTotal({
        nome: filtros.nome,
        role: filtros.role,
        bloqueadoTorneios: filtros.bloqueadoTorneios,
      }),
    ]);

    return {
      usuarios: usuarios.map((u) => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        role: u.role,
        nickMTGO: u.nickMTGO,
        nickArena: u.nickArena,
        bloqueadoTorneios: u.bloqueadoTorneios,
      })),
      total,
      limite,
      offset,
    };
  }
}
