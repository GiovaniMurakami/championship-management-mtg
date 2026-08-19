import { StoryFundo } from "../../dominio/entidade/storyFundo";
import type { StoryTextoRodape } from "../../dominio/entidade/storyFundo";
import { StoryFundoGateway } from "../../dominio/gateway/storyFundoGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { toBrasiliaISO } from "../../helpers/data/brasilia";

export type CadastrarStoryFundoInputDto = {
  nome: string;
  url: string;
  textoRodape?: StoryTextoRodape;
};

export type CadastrarStoryFundoOutputDto = {
  id: string;
  nome: string;
  url: string;
  textoRodape: StoryTextoRodape;
  criadoEm: string;
};

export class CadastrarStoryFundo
  implements CasoDeUso<CadastrarStoryFundoInputDto, CadastrarStoryFundoOutputDto> {
  private constructor(private readonly storyFundoGateway: StoryFundoGateway) {}

  public static criar(storyFundoGateway: StoryFundoGateway) {
    return new CadastrarStoryFundo(storyFundoGateway);
  }

  public async executar(input: CadastrarStoryFundoInputDto): Promise<CadastrarStoryFundoOutputDto> {
    const nome = input.nome.trim();
    const url = input.url.trim();

    if (!nome) {
      throw ErroPersonalizado.criar({
        mensagem: "Nome do fundo é obrigatório.",
        status: StatusErro.erroParametro,
      });
    }

    if (!url) {
      throw ErroPersonalizado.criar({
        mensagem: "URL da imagem do fundo é obrigatória.",
        status: StatusErro.erroParametro,
      });
    }

    const existentes = await this.storyFundoGateway.listar();
    const nomeNormalizado = nome.toLowerCase();
    if (existentes.some((f) => f.nome.trim().toLowerCase() === nomeNormalizado)) {
      throw ErroPersonalizado.criar({
        mensagem: "Já existe um fundo de story com este nome.",
        status: StatusErro.erroParametro,
      });
    }

    const fundo = StoryFundo.criar({ nome, url, textoRodape: input.textoRodape });
    try {
      await this.storyFundoGateway.salvar(fundo);
    } catch (error) {
      const code = (error as { code?: number })?.code;
      if (code === 11000) {
        throw ErroPersonalizado.criar({
          mensagem: "Já existe um fundo de story com este nome.",
          status: StatusErro.erroParametro,
        });
      }
      throw error;
    }

    return {
      id: fundo.id,
      nome: fundo.nome,
      url: fundo.url,
      textoRodape: fundo.textoRodape,
      criadoEm: toBrasiliaISO(fundo.criadoEm)!,
    };
  }
}
