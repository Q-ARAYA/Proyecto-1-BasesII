import { randomUUID } from "node:crypto";

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export function requestId(req, res, next) {
  req.requestId = randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}

function sqlErrorNumber(error) {
  return error?.originalError?.info?.number
    ?? error?.originalError?.number
    ?? error?.number;
}

export function errorHandler(error, req, res, _next) {
  if (res.headersSent) return;

  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: { message: error.message, ...(error.details ? { details: error.details } : {}) },
      requestId: req.requestId,
    });
  }

  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ error: { message: "El cuerpo JSON no tiene un formato válido." }, requestId: req.requestId });
  }
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ error: { message: "El cuerpo supera el máximo de 64 KB." }, requestId: req.requestId });
  }

  const number = sqlErrorNumber(error);
  if (number >= 51000 && number < 52000) {
    const status = [51028, 51031].includes(number) ? 404 : number === 51032 ? 409 : 400;
    const message = error?.originalError?.info?.message || error.message || "Los datos enviados no son válidos.";
    return res.status(status).json({ error: { message }, requestId: req.requestId });
  }

  if ([547, 2601, 2627].includes(number)) {
    return res.status(409).json({
      error: { message: "La operación entra en conflicto con datos relacionados o duplicados." },
      requestId: req.requestId,
    });
  }

  const isUnavailable = ["ESOCKET", "ECONNCLOSED", "ENOCONN", "ETIMEOUT", "ELOGIN"].includes(error?.code);
  console.error("Error de API:", {
    requestId: req.requestId,
    code: error?.code || "INTERNAL_ERROR",
    number,
  });

  return res.status(isUnavailable ? 503 : 500).json({
    error: {
      message: isUnavailable
        ? "No se pudo conectar con SQL Server. Revisa el contenedor y la configuración local."
        : "Ocurrió un error interno al procesar la solicitud.",
    },
    requestId: req.requestId,
  });
}
