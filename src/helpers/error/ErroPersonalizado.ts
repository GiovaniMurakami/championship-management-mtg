type ErroParametros = {
  mensagem: string;
  status: number;
  erros?: string[] | [];
  extra?: unknown | null;
};

export class ErroPersonalizado extends Error {
  public status: number;
  public erros: string[];
  public extra: unknown | null;

  private constructor({ mensagem, status, erros, extra }: ErroParametros) {
    super(mensagem || "Erro interno do servidor");

    this.status = status || 500;
    this.erros = erros || [];
    this.extra = extra || null;

    Object.setPrototypeOf(this, ErroPersonalizado.prototype);
  }

  public static criar(parametros: ErroParametros): ErroPersonalizado {
    return new ErroPersonalizado(parametros);
  }

  public formatarErros(): string {
    return this.erros.join("\n");
  }

  public erroSemStatus() {
    return {
      mensagem: this.message,
      erros: this.erros,
      extra: this.extra,
    };
  }
}
