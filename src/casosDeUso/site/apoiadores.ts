import { Apoiador } from "../../dominio/entidade/apoiador";
import { ApoiadorGateway } from "../../dominio/gateway/apoiadorGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type ApoiadorOutputDto = {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
};

function mapApoiador(apoiador: Apoiador): ApoiadorOutputDto {
  return {
    id: apoiador.id,
    nome: apoiador.nome,
    ordem: apoiador.ordem,
    ativo: apoiador.ativo,
    criadoEm: apoiador.criadoEm,
    atualizadoEm: apoiador.atualizadoEm,
  };
}

export class ListarApoiadores implements CasoDeUso<{ admin?: boolean }, { apoiadores: ApoiadorOutputDto[] }> {
  private constructor(private readonly apoiadorGateway: ApoiadorGateway) {}

  public static criar(apoiadorGateway: ApoiadorGateway) {
    return new ListarApoiadores(apoiadorGateway);
  }

  public async executar(input: { admin?: boolean } = {}) {
    const apoiadores = await this.apoiadorGateway.listar(!input.admin);
    return { apoiadores: apoiadores.map(mapApoiador) };
  }
}

export type CriarApoiadorInputDto = {
  nome: string;
  ordem?: number;
  ativo?: boolean;
};

export class CriarApoiador implements CasoDeUso<CriarApoiadorInputDto, ApoiadorOutputDto> {
  private constructor(private readonly apoiadorGateway: ApoiadorGateway) {}

  public static criar(apoiadorGateway: ApoiadorGateway) {
    return new CriarApoiador(apoiadorGateway);
  }

  public async executar(input: CriarApoiadorInputDto): Promise<ApoiadorOutputDto> {
    const apoiador = Apoiador.criar({
      nome: input.nome.trim(),
      ordem: input.ordem ?? 0,
      ativo: input.ativo ?? true,
    });
    await this.apoiadorGateway.salvar(apoiador);
    return mapApoiador(apoiador);
  }
}

export type AlterarApoiadorInputDto = {
  id: string;
  nome?: string;
  ordem?: number;
  ativo?: boolean;
};

export class AlterarApoiador implements CasoDeUso<AlterarApoiadorInputDto, ApoiadorOutputDto> {
  private constructor(private readonly apoiadorGateway: ApoiadorGateway) {}

  public static criar(apoiadorGateway: ApoiadorGateway) {
    return new AlterarApoiador(apoiadorGateway);
  }

  public async executar(input: AlterarApoiadorInputDto): Promise<ApoiadorOutputDto> {
    const apoiador = await this.apoiadorGateway.buscarPorId(input.id);
    if (!apoiador) {
      throw ErroPersonalizado.criar({
        mensagem: "Apoiador não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (input.nome !== undefined) apoiador.nome = input.nome.trim();
    if (input.ordem !== undefined) apoiador.ordem = input.ordem;
    if (input.ativo !== undefined) apoiador.ativo = input.ativo;
    apoiador.atualizadoEm = new Date();

    await this.apoiadorGateway.atualizar(apoiador);
    return mapApoiador(apoiador);
  }
}

export class ExcluirApoiador implements CasoDeUso<{ id: string }, { mensagem: string }> {
  private constructor(private readonly apoiadorGateway: ApoiadorGateway) {}

  public static criar(apoiadorGateway: ApoiadorGateway) {
    return new ExcluirApoiador(apoiadorGateway);
  }

  public async executar(input: { id: string }) {
    const apoiador = await this.apoiadorGateway.buscarPorId(input.id);
    if (!apoiador) {
      throw ErroPersonalizado.criar({
        mensagem: "Apoiador não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }
    await this.apoiadorGateway.excluir(input.id);
    return { mensagem: "Apoiador excluído com sucesso." };
  }
}
