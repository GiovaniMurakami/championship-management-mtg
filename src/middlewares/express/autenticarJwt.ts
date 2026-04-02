import { Request, Response, NextFunction } from "express";
import { TokenBlacklistRepositorio } from "../../infra/mongodb/repositorios/tokenBlacklistRepositorio";
import { verifyToken } from "../../helpers/jwt";

const blacklist = TokenBlacklistRepositorio.criar();

export const autenticarJwt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ mensagem: "Token não informado." });
    return;
  }

  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ mensagem: "Token inválido ou expirado." });
    return;
  }

  if (await blacklist.existe(token)) {
    res.status(401).json({ mensagem: "Token inválido ou expirado." });
    return;
  }

  req.usuario = { id: payload.id, email: payload.email, nome: payload.nome, role: payload.role || "user" };
  next();
};
