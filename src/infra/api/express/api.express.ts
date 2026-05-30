import { Api } from "../api";
import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import { sanitizarEntrada } from "../../../middlewares/express/sanitizarEntrada";
import { Rotas } from "./rotas/rotas";
import { ErroPersonalizado } from "../../../helpers/error/ErroPersonalizado";
import { logger } from "../../../helpers/logger";
import { getCorsOrigins } from "../../../helpers/env";

function extrairErrosMongoose(err: unknown): string[] {
  const erros = (err as { errors?: Record<string, { message?: string }> })?.errors;
  if (!erros) return [];
  return Object.values(erros)
    .map((erro) => erro?.message)
    .filter((mensagem): mensagem is string => Boolean(mensagem));
}

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
    const corsOrigins = getCorsOrigins();

    this.app.set("trust proxy", 1);
    this.app.use(helmet());
    this.app.use(cors({
      origin: (origin, callback) => {
        if (!origin || corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }));
    this.app.use(compression());
    this.app.use(express.json({ limit: "100kb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "100kb" }));
    this.app.use(mongoSanitize());
    this.app.use(sanitizarEntrada);
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
        const errosMongoose = extrairErrosMongoose(err);
        if (errosMongoose.length > 0) {
          res.status(400).json({ mensagem: errosMongoose[0], erros: errosMongoose });
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
