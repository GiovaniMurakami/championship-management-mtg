import { conectarMongoDB } from "../conexao";

export abstract class BaseRepositorio {
  protected async conectar() {
    return conectarMongoDB();
  }
}
