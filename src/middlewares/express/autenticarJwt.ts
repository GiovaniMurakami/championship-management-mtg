import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

type JwtPayload = {
  id: string;
  email: string;
  nome: string;
};

export const autenticarJwt = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
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
    const payload = jwt.verify(token, jwtSecret) as JwtPayload;
    req.usuario = { id: payload.id, email: payload.email, nome: payload.nome };
    next();
  } catch {
    res.status(401).json({ mensagem: "Token inválido ou expirado." });
  }
};
