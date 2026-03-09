declare namespace Express {
  interface Request {
    usuario?: {
      id: string;
      email: string;
      nome: string;
    };
  }
}
