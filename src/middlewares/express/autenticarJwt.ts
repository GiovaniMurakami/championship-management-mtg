import { Request, Response, NextFunction } from "express";
import { TokenBlacklistGateway } from "../../dominio/gateway/tokenBlacklistGateway";
import { TokenBlacklistRepositorio } from "../../infra/mongodb/repositorios/tokenBlacklistRepositorio";
import { verifyToken } from "../../helpers/jwt";

// Gateway injetável — configurado em app.ts via inicializarAutenticarJwt()
// Fallback para instância própria se a inicialização não ocorrer (testes, ambiente local).
let _blacklistGateway: TokenBlacklistGateway | undefined;

export function inicializarAutenticarJwt(gateway: TokenBlacklistGateway): void {
  _blacklistGateway = gateway;
}

function getBlacklistGateway(): TokenBlacklistGateway {
  if (!_blacklistGateway) {
    _blacklistGateway = TokenBlacklistRepositorio.criar();
  }
  return _blacklistGateway;
}

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

  if (await getBlacklistGateway().existe(token)) {
    res.status(401).json({ mensagem: "Token inválido ou expirado." });
    return;
  }

  req.usuario = { id: payload.id, email: payload.email, nome: payload.nome, role: payload.role || "user" };
  next();
};
