import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";
import { logger } from "../../helpers/logger";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers["x-request-id"];
  const requestId = (typeof header === "string" && header.trim()) || randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  req.log = logger.child({ requestId });
  next();
}
