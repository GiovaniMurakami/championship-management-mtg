import { Usuario } from "../../../dominio/entidade/usuario";
import { EmailUsuarioJaExisteErro, FiltrosListarUsuarios, UsuarioGateway } from "../../../dominio/gateway/usuarioGateway";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

type UsuarioItem = {
  id: string;
  nome: string;
  email: string;
  senha: string;
  role: "user" | "admin";
  telefone?: string;
  nickMTGO?: string;
  nickArena?: string;
  fotoUrl?: string;
  resultadosExpressivos: number;
  bloqueadoTorneios: boolean;
  excluido: boolean;
  excluidoEm?: string | null;
  criadoEm: string;
};

type UsuarioEmailIndex = {
  id: string;
  email: string;
};

const USUARIOS_PK = "USUARIOS";

export class UsuarioDynamoRepositorio extends BaseDynamoRepositorio implements UsuarioGateway {
  private constructor() {
    super();
  }

  public static criar() {
    return new UsuarioDynamoRepositorio();
  }

  public async salvar(usuario: Usuario): Promise<void> {
    const item = this.usuarioParaItem(usuario);
    try {
      await this.transactWrite([
        { Put: { TableName: this.tabela, Item: this.itemJson(`USER#${usuario.id}`, "DATA", item, { entity: "USER", resultadosExpressivos: item.resultadosExpressivos }) } },
        { Put: { TableName: this.tabela, Item: this.itemJson(USUARIOS_PK, `USER#${usuario.id}`, item, { entity: "USER_INDEX", resultadosExpressivos: item.resultadosExpressivos }) } },
        {
          Put: {
            TableName: this.tabela,
            Item: this.itemJson(`USER_EMAIL#${this.normalizarEmail(usuario.email)}`, "DATA", { id: usuario.id, email: usuario.email }, { entity: "USER_EMAIL_INDEX" }),
            ConditionExpression: "attribute_not_exists(pk)",
          },
        },
      ]);
    } catch (error) {
      if ((error as { name?: string }).name === "TransactionCanceledException") {
        throw new EmailUsuarioJaExisteErro();
      }
      throw error;
    }
  }

  public async buscarPorEmail(email: string): Promise<Usuario | null> {
    const indice = await this.getJson<UsuarioEmailIndex>(`USER_EMAIL#${this.normalizarEmail(email)}`, "DATA");
    if (!indice) return null;
    return this.buscarPorId(indice.id);
  }

  public async buscarPorId(id: string): Promise<Usuario | null> {
    const item = await this.getJson<UsuarioItem>(`USER#${id}`, "DATA");
    return item ? this.itemParaUsuario(item) : null;
  }

  public async buscarVarios(ids: string[]): Promise<Usuario[]> {
    const unicos = Array.from(new Set(ids));
    const usuarios = await Promise.all(unicos.map((id) => this.buscarPorId(id)));
    return usuarios.filter((usuario): usuario is Usuario => usuario !== null);
  }

  public async listar(filtros: FiltrosListarUsuarios = {}): Promise<Usuario[]> {
    const itens = await this.queryJson<UsuarioItem>(USUARIOS_PK);
    const filtrados = this.filtrar(itens, filtros)
      .sort((a, b) => a.nome.localeCompare(b.nome) || a.id.localeCompare(b.id));

    const offset = filtros.offset ?? 0;
    const limite = filtros.limite ?? filtrados.length;
    return filtrados
      .slice(offset, offset + limite)
      .map((item) => this.itemParaUsuario(item));
  }

  public async listarTotal(filtros: Pick<FiltrosListarUsuarios, "nome" | "bloqueadoTorneios"> = {}): Promise<number> {
    const itens = await this.queryJson<UsuarioItem>(USUARIOS_PK);
    return this.filtrar(itens, filtros).length;
  }

  public async atualizar(usuario: Usuario): Promise<void> {
    const atual = await this.buscarPorId(usuario.id);
    const item = this.usuarioParaItem(usuario);
    const emailAnterior = atual ? this.normalizarEmail(atual.email) : null;
    const emailAtual = this.normalizarEmail(usuario.email);
    try {
      await this.transactWrite([
        { Put: { TableName: this.tabela, Item: this.itemJson(`USER#${usuario.id}`, "DATA", item, { entity: "USER", resultadosExpressivos: item.resultadosExpressivos }) } },
        { Put: { TableName: this.tabela, Item: this.itemJson(USUARIOS_PK, `USER#${usuario.id}`, item, { entity: "USER_INDEX", resultadosExpressivos: item.resultadosExpressivos }) } },
        {
          Put: {
            TableName: this.tabela,
            Item: this.itemJson(`USER_EMAIL#${emailAtual}`, "DATA", { id: usuario.id, email: usuario.email }, { entity: "USER_EMAIL_INDEX" }),
            ...(emailAnterior !== emailAtual ? { ConditionExpression: "attribute_not_exists(pk)" } : {}),
          },
        },
        ...(emailAnterior && emailAnterior !== emailAtual ? [{
          Delete: {
            TableName: this.tabela,
            Key: { pk: { S: `USER_EMAIL#${emailAnterior}` }, sk: { S: "DATA" } },
          },
        }] : []),
      ]);
    } catch (error) {
      if ((error as { name?: string }).name === "TransactionCanceledException") {
        throw new EmailUsuarioJaExisteErro();
      }
      throw error;
    }
  }

  public async excluir(id: string): Promise<void> {
    const usuario = await this.buscarPorId(id);
    await this.transactWriteRequests([
      this.toDeleteRequest(`USER#${id}`, "DATA"),
      this.toDeleteRequest(USUARIOS_PK, `USER#${id}`),
      ...(usuario ? [this.toDeleteRequest(`USER_EMAIL#${this.normalizarEmail(usuario.email)}`, "DATA")] : []),
    ]);
  }

  public async incrementarResultadosExpressivos(ids: string[], incremento: number): Promise<void> {
    if (ids.length === 0 || incremento === 0) return;
    await Promise.all(Array.from(new Set(ids)).map((id) => this.transactWrite([
      {
        Update: {
          TableName: this.tabela,
          Key: { pk: { S: `USER#${id}` }, sk: { S: "DATA" } },
          UpdateExpression: "ADD resultadosExpressivos :incremento",
          ExpressionAttributeValues: { ":incremento": { N: String(incremento) } },
          ConditionExpression: "attribute_exists(pk)",
        },
      },
      {
        Update: {
          TableName: this.tabela,
          Key: { pk: { S: USUARIOS_PK }, sk: { S: `USER#${id}` } },
          UpdateExpression: "ADD resultadosExpressivos :incremento",
          ExpressionAttributeValues: { ":incremento": { N: String(incremento) } },
          ConditionExpression: "attribute_exists(pk)",
        },
      },
    ])));
  }

  private filtrar(itens: UsuarioItem[], filtros: Pick<FiltrosListarUsuarios, "nome" | "bloqueadoTorneios" | "excluido">): UsuarioItem[] {
    const termo = filtros.nome?.trim().toLowerCase();
    return itens.filter((item) => {
      const excluidoDesejado = filtros.excluido === true;
      if (excluidoDesejado !== Boolean(item.excluido)) return false;

      if (filtros.bloqueadoTorneios !== undefined && Boolean(item.bloqueadoTorneios) !== filtros.bloqueadoTorneios) {
        return false;
      }

      if (!termo) return true;
      return [
        item.nome,
        item.email,
        item.nickMTGO,
        item.nickArena,
      ].some((valor) => valor?.toLowerCase().includes(termo));
    });
  }

  private usuarioParaItem(usuario: Usuario): UsuarioItem {
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      senha: usuario.senha,
      role: usuario.role,
      telefone: usuario.telefone,
      nickMTGO: usuario.nickMTGO,
      nickArena: usuario.nickArena,
      fotoUrl: usuario.fotoUrl,
      resultadosExpressivos: usuario.resultadosExpressivos,
      bloqueadoTorneios: usuario.bloqueadoTorneios,
      excluido: usuario.excluido,
      excluidoEm: usuario.excluidoEm?.toISOString() ?? null,
      criadoEm: usuario.criadoEm.toISOString(),
    };
  }

  private itemParaUsuario(item: UsuarioItem): Usuario {
    return new Usuario({
      id: item.id,
      nome: item.nome,
      email: item.email,
      senha: item.senha,
      role: item.role,
      telefone: item.telefone,
      nickMTGO: item.nickMTGO,
      nickArena: item.nickArena,
      fotoUrl: item.fotoUrl,
      resultadosExpressivos: item.resultadosExpressivos,
      bloqueadoTorneios: item.bloqueadoTorneios,
      excluido: item.excluido,
      excluidoEm: item.excluidoEm ? new Date(item.excluidoEm) : null,
      criadoEm: new Date(item.criadoEm),
    });
  }

  private normalizarEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
