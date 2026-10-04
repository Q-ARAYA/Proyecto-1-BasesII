import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { errorHandler, HttpError, requestId } from "./errors.js";
import { checkDatabase } from "./db.js";
import { router } from "./routes.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(requestId);
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new HttpError(403, "Este origen no está autorizado para consumir la API."));
  },
}));
app.use(express.json({ limit: "64kb", strict: true }));
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.get("/api/health/live", (_req, res) => res.json({ status: "ok" }));
app.get("/api/health/ready", async (_req, res) => {
  await checkDatabase();
  res.json({ status: "ok", database: "connected" });
});
app.use("/api", router);
app.use((_req, _res, next) => next(new HttpError(404, "La ruta solicitada no existe.")));
app.use(errorHandler);
