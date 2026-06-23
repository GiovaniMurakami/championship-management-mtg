import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../../helpers/jwt";
import { getBlacklistGateway } from "./autenticarJwtGateway";

export const autenticarJwtOpcional = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    next();
    return;
  }

  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ mensagem: "Token inválido ou expirado." });
    return;
  }

  if (await getBlacklistGateway().existe(token)) {
    res.status(401).json({ mensagem: "Token inválido ou expirado." });
    return;
  }

  req.usuario = {
    id: payload.id,
    email: payload.email,
    nome: payload.nome,
    role: payload.role || "user",
  };
  next();
};
