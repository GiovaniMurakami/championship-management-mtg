import { Request, Response, NextFunction } from "express";

export const autorizarEditorOuAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const role = req.usuario?.role;
  if (role !== "admin" && role !== "editor") {
    res.status(403).json({ mensagem: "Acesso restrito a editores e administradores." });
    return;
  }
  next();
};
