import { Api } from "../api";
import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { Rotas } from "./rotas/rotas";
import { ErroPersonalizado } from "../../../helpers/error/ErroPersonalizado";
import { logger } from "../../../helpers/logger";

export class ApiExpress implements Api {
  private app: Express;

  private constructor(rotas: Rotas[]) {
    this.app = express();
    this.adicionarMiddlewares();
    this.adicionarRota(rotas);
    this.adicionarErroHandler();
  }

  public static criar(rotas: Rotas[]) {
    return new ApiExpress(rotas);
  }

  private adicionarMiddlewares(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      logger.info({ method: req.method, path: req.path }, "request");
      next();
    });
  }

  private adicionarRota(rotas: Rotas[]) {
    rotas.forEach((rota) => {
      const caminho = rota.getCaminho();
      const metodo = rota.getMetodo() as keyof Express;
      const middlewares = rota.getMiddlewares ? rota.getMiddlewares() : [];
      const handler = rota.getHandler() as (
        req: Request,
        res: Response,
        next: NextFunction
      ) => void;

      this.app[metodo](caminho, ...middlewares, handler);
    });
  }

  private adicionarErroHandler(): void {
    this.app.use(
      (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
        if (err instanceof ErroPersonalizado) {
          res.status(err.status).json({ mensagem: err.message, erros: err.erros });
          return;
        }
        logger.error({ err }, "erro nao tratado");
        res.status(500).json({ mensagem: "Erro interno do servidor." });
      }
    );
  }

  public retornarAplicacao(): Express {
    return this.app;
  }

  public start(port: number) {
    this.app.listen(port, () => {
      logger.info({ port }, "Aplicação iniciada");
    });
  }
}
