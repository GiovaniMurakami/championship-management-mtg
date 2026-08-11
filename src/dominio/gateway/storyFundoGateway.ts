import { StoryFundo } from "../entidade/storyFundo";

export interface StoryFundoGateway {
  salvar(fundo: StoryFundo): Promise<void>;
  listar(): Promise<StoryFundo[]>;
  buscarPorId(id: string): Promise<StoryFundo | null>;
  excluir(id: string): Promise<boolean>;
}
