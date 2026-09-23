import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { normalizarPaginacaoOffset } from "../../helpers/paginacao";

const LIMITE_MAX = 100;
const LIMITE_PADRAO = 40;

export type ListarAssinantesNewsletterInputDto = {
  nome?: string;
  limite?: number;
  offset?: number;
};

export type ListarAssinantesNewsletterOutputDto = {
  assinantes: Array<{
    id: string;
    nome: string;
    email: string;
    role: string;
    criadoEm: string | null;
  }>;
  total: number;
  limite: number;
  offset: number;
};

export class ListarAssinantesNewsletter
  implements CasoDeUso<ListarAssinantesNewsletterInputDto, ListarAssinantesNewsletterOutputDto>
{
  private constructor(private readonly usuarioGateway: UsuarioGateway) {}

  public static criar(usuarioGateway: UsuarioGateway) {
    return new ListarAssinantesNewsletter(usuarioGateway);
  }

  public async executar(input: ListarAssinantesNewsletterInputDto = {}) {
    const { limite, offset } = normalizarPaginacaoOffset(
      input.limite,
      input.offset,
      LIMITE_PADRAO,
      LIMITE_MAX,
    );
    const nome = input.nome?.trim() || undefined;
    const filtros = {
      nome,
      excluido: false,
      newsletterMetagame: true as const,
      limite,
      offset,
    };

    const [usuarios, total] = await Promise.all([
      this.usuarioGateway.listar(filtros),
      this.usuarioGateway.listarTotal({
        nome,
        newsletterMetagame: true,
      }),
    ]);

    return {
      assinantes: usuarios.map((u) => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        role: u.role,
        criadoEm: u.criadoEm ? u.criadoEm.toISOString() : null,
      })),
      total,
      limite,
      offset,
    };
  }
}
