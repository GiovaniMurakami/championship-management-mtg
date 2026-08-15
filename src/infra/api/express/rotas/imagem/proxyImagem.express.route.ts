import { NextFunction, Request, RequestHandler, Response } from "express";
import { HttpMethod, Rotas } from "../rotas";
import { publicReadRateLimiter } from "../../../../../middlewares/express/rateLimiter";
import { proxyImagemQuerySchema } from "../../../../../helpers/validacao/schemas";
import { validarQuery } from "../../../../../helpers/validacao/validarQuery";
import { getS3BaseUrl } from "../../../../../helpers/env";

const TAMANHO_MAXIMO_PROXY_BYTES = 5 * 1024 * 1024;

/**
 * Espelha imagens do bucket S3 autorizado para o browser (canvas do story Top 8).
 * O CSS/img carrega S3 sem CORS; o canvas precisa de ACAO — em produção o front
 * usa este endpoint no lugar do proxy Vite de desenvolvimento.
 */
export class ProxyImagemRota implements Rotas {
  private constructor(
    private readonly caminho: string,
    private readonly metodo: HttpMethod,
  ) {}

  public static criar() {
    return new ProxyImagemRota("/imagem/proxy", HttpMethod.GET);
  }

  public getCaminho(): string {
    return this.caminho;
  }

  public getMetodo(): HttpMethod {
    return this.metodo;
  }

  public getMiddlewares(): RequestHandler[] {
    return [publicReadRateLimiter];
  }

  public getHandler() {
    return async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      try {
        const dados = validarQuery(proxyImagemQuerySchema, request.query, response);
        if (!dados) return;

        const base = getS3BaseUrl();
        if (!base || !dados.url.startsWith(`${base}/`)) {
          response.status(400).json({
            mensagem: "A URL da imagem deve pertencer ao bucket S3 autorizado.",
          });
          return;
        }

        const upstream = await fetch(dados.url, {
          method: "GET",
          redirect: "error",
        });

        if (!upstream.ok) {
          response.status(upstream.status === 404 ? 404 : 502).json({
            mensagem: "Não foi possível obter a imagem.",
          });
          return;
        }

        const contentType = upstream.headers.get("content-type") || "application/octet-stream";
        if (!contentType.startsWith("image/") && contentType !== "application/octet-stream") {
          response.status(400).json({ mensagem: "Conteúdo remoto não é uma imagem." });
          return;
        }

        const buffer = Buffer.from(await upstream.arrayBuffer());
        if (buffer.byteLength === 0 || buffer.byteLength > TAMANHO_MAXIMO_PROXY_BYTES) {
          response.status(400).json({ mensagem: "Imagem inválida ou maior que 5 MB." });
          return;
        }

        response.setHeader("Content-Type", contentType.startsWith("image/") ? contentType : "application/octet-stream");
        response.setHeader("Cache-Control", "public, max-age=300");
        response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        response.status(200).send(buffer);
      } catch (error) {
        next(error);
      }
    };
  }
}
