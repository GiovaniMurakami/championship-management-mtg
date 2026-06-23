import { NextFunction, Request, RequestHandler, Response } from "express";
import { ListarTorneios } from "../../../../../casosDeUso/torneio/listarTorneios";
import { HttpMethod, Rotas } from "../rotas";
import { ErroPersonalizado } from "../../../../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../../../../helpers/error/statusErro";
import { autenticarJwt } from "../../../../../middlewares/express/autenticarJwt";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { listarTorneiosQuerySchema } from "../../../../../helpers/validacao/schemas";
import { validarQueryMiddleware } from "../../../../../helpers/validacao/validarQuery";
import { z } from "zod";
import { StatusTorneio } from "../../../../../dominio/entidade/torneio";

type ListarTorneiosQuery = z.infer<typeof listarTorneiosQuerySchema>;

function parseDataFiltro(valor: string | undefined, campo: string, fimDoDia = false): Date | undefined {
  if (!valor) return undefined;
  const data = /^\d{4}-\d{2}-\d{2}$/.test(valor)
    ? new Date(`${valor}T${fimDoDia ? "23:59:59.999" : "00:00:00.000"}Z`)
    : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    throw ErroPersonalizado.criar({
      mensagem: `${campo} deve ser uma data válida.`,
      status: StatusErro.erroParametro,
    });
  }

  return data;
}

export class ListarTorneiosRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
    private readonly listarTorneiosServico: ListarTorneios
  ) { }

  public static criar(listarTorneiosServico: ListarTorneios) {
    return new ListarTorneiosRota(
      "/torneio/listar",
      HttpMethod.GET,
      listarTorneiosServico
    );
  }

  public getCaminho(): string { return this.caminho; }
  public getMetodo(): HttpMethod { return this.metodo; }
  public getMiddlewares(): RequestHandler[] {
    return [validarQueryMiddleware(listarTorneiosQuerySchema), publicReadRateLimiter, autenticarJwt];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const {
          limite,
          offset,
          status,
          nome,
          dataInicio: dataInicioStr,
          dataFim: dataFimStr,
        } = request.queryValidados as ListarTorneiosQuery;
        const dataInicio = parseDataFiltro(dataInicioStr, "dataInicio");
        const dataFim = parseDataFiltro(dataFimStr, "dataFim", true);

        if (dataInicio && dataFim && dataInicio > dataFim) {
          throw ErroPersonalizado.criar({
            mensagem: "dataInicio não pode ser maior que dataFim.",
            status: StatusErro.erroParametro,
          });
        }

        const resultado = await this.listarTorneiosServico.executar({
          usuarioId: request.usuario!.id,
          limite,
          offset,
          status: status as StatusTorneio | undefined,
          nome,
          dataInicio,
          dataFim,
        });
        response.status(200).json(resultado);
      } catch (error) {
        if (error instanceof ErroPersonalizado) {
          response.status(error.status).json({ mensagem: error.message, erros: error.erros });
          return;
        }
        next(error);
      }
    };
  }
}
