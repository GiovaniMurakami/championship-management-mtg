import { Api } from "../api";
import express, { Express, Request, Response, NextFunction } from "express";
import { Rotas } from "./rotas/rotas";

export class ApiExpress implements Api {
  private app: Express;

  private constructor(rotas: Rotas[]) {
    this.app = express();
    this.adicionarMiddlewares();
    this.adicionarRota(rotas);
  }

  public static criar(rotas: Rotas[]) {
    return new ApiExpress(rotas);
  }

  private adicionarMiddlewares(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private adicionarRota(rotas: Rotas[]) {
    rotas.forEach((rota) => {
      const caminho = rota.getCaminho();
      const metodo = rota.getMetodo() as keyof Express;
      const handler = rota.getHandler() as (
        req: Request,
        res: Response,
        next: NextFunction
      ) => void;

      this.app[metodo](caminho, handler);
    });
  }

  public retornarAplicacao(): Express {
    return this.app;
  }

  public start(port: number) {
    this.app.listen(port, () => {
      console.log(`Aplicação rodando na porta ${port}`);
    });
  }
}
