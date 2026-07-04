import { Parceiro } from "../../dominio/entidade/parceiro";
import { ParceiroGateway } from "../../dominio/gateway/parceiroGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type ParceiroOutputDto = {
  id: string;
  nome: string;
  imagemUrl: string;
  linkUrl?: string;
  ordem: number;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
};

function mapParceiro(parceiro: Parceiro): ParceiroOutputDto {
  return {
    id: parceiro.id,
    nome: parceiro.nome,
    imagemUrl: parceiro.imagemUrl,
    linkUrl: parceiro.linkUrl,
    ordem: parceiro.ordem,
    ativo: parceiro.ativo,
    criadoEm: parceiro.criadoEm,
    atualizadoEm: parceiro.atualizadoEm,
  };
}

export class ListarParceiros implements CasoDeUso<{ admin?: boolean }, { parceiros: ParceiroOutputDto[] }> {
  private constructor(private readonly parceiroGateway: ParceiroGateway) {}

  public static criar(parceiroGateway: ParceiroGateway) {
    return new ListarParceiros(parceiroGateway);
  }

  public async executar(input: { admin?: boolean } = {}) {
    const parceiros = await this.parceiroGateway.listar(!input.admin);
    return { parceiros: parceiros.map(mapParceiro) };
  }
}

export type CriarParceiroInputDto = {
  nome: string;
  imagemUrl: string;
  linkUrl?: string;
  ordem?: number;
  ativo?: boolean;
};

export class CriarParceiro implements CasoDeUso<CriarParceiroInputDto, ParceiroOutputDto> {
  private constructor(private readonly parceiroGateway: ParceiroGateway) {}

  public static criar(parceiroGateway: ParceiroGateway) {
    return new CriarParceiro(parceiroGateway);
  }

  public async executar(input: CriarParceiroInputDto): Promise<ParceiroOutputDto> {
    const parceiro = Parceiro.criar({
      nome: input.nome.trim(),
      imagemUrl: input.imagemUrl.trim(),
      linkUrl: input.linkUrl?.trim() || undefined,
      ordem: input.ordem ?? 0,
      ativo: input.ativo ?? true,
    });
    await this.parceiroGateway.salvar(parceiro);
    return mapParceiro(parceiro);
  }
}

export type AlterarParceiroInputDto = {
  id: string;
  nome?: string;
  imagemUrl?: string;
  linkUrl?: string;
  ordem?: number;
  ativo?: boolean;
};

export class AlterarParceiro implements CasoDeUso<AlterarParceiroInputDto, ParceiroOutputDto> {
  private constructor(private readonly parceiroGateway: ParceiroGateway) {}

  public static criar(parceiroGateway: ParceiroGateway) {
    return new AlterarParceiro(parceiroGateway);
  }

  public async executar(input: AlterarParceiroInputDto): Promise<ParceiroOutputDto> {
    const parceiro = await this.parceiroGateway.buscarPorId(input.id);
    if (!parceiro) {
      throw ErroPersonalizado.criar({
        mensagem: "Parceiro não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (input.nome !== undefined) parceiro.nome = input.nome.trim();
    if (input.imagemUrl !== undefined) parceiro.imagemUrl = input.imagemUrl.trim();
    if (input.linkUrl !== undefined) parceiro.linkUrl = input.linkUrl.trim() || undefined;
    if (input.ordem !== undefined) parceiro.ordem = input.ordem;
    if (input.ativo !== undefined) parceiro.ativo = input.ativo;
    parceiro.atualizadoEm = new Date();

    await this.parceiroGateway.atualizar(parceiro);
    return mapParceiro(parceiro);
  }
}

export class ExcluirParceiro implements CasoDeUso<{ id: string }, { mensagem: string }> {
  private constructor(private readonly parceiroGateway: ParceiroGateway) {}

  public static criar(parceiroGateway: ParceiroGateway) {
    return new ExcluirParceiro(parceiroGateway);
  }

  public async executar(input: { id: string }) {
    const parceiro = await this.parceiroGateway.buscarPorId(input.id);
    if (!parceiro) {
      throw ErroPersonalizado.criar({
        mensagem: "Parceiro não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }
    await this.parceiroGateway.excluir(input.id);
    return { mensagem: "Parceiro excluído com sucesso." };
  }
}
