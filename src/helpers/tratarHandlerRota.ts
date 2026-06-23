import { Request, Response, NextFunction, RequestHandler } from "express";
import { ErroPersonalizado } from "./error/ErroPersonalizado";

export function tratarHandlerRota(
  handler: (req: Request, res: Response) => Promise<void>
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof ErroPersonalizado) {
        res.status(error.status).json({ mensagem: error.message, erros: error.erros });
        return;
      }
      next(error);
    }
  };
}
