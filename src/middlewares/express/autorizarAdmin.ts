import { Request, Response, NextFunction } from "express";

export const autorizarAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.usuario?.role !== "admin") {
    res.status(403).json({ mensagem: "Acesso restrito a administradores." });
    return;
  }
  next();
};
