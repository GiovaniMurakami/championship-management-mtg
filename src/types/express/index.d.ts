declare namespace Express {
  interface Request {
    usuario?: {
      id: string;
      email: string;
      nome: string;
      role: string;
    };
    requestId?: string;
    log?: import("pino").Logger;
    paramsValidados?: Record<string, unknown>;
    queryValidados?: Record<string, unknown>;
  }
}
