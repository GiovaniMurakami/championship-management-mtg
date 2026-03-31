import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { TokenBlacklistRepositorio } from "../../infra/mongodb/repositorios/tokenBlacklistRepositorio";

type JwtPayload = {
  id: string;
  email: string;
  nome: string;
  role: string;
};

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

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    res.status(500).json({ mensagem: "Erro interno do servidor." });
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] }) as JwtPayload;

    if (await blacklist.existe(token)) {
      res.status(401).json({ mensagem: "Token inválido ou expirado." });
      return;
    }

    req.usuario = { id: payload.id, email: payload.email, nome: payload.nome, role: payload.role || "user" };
    next();
  } catch {
    res.status(401).json({ mensagem: "Token inválido ou expirado." });
  }
};
