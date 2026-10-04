import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(here, "../../.env") });

function integerFromEnv(name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} debe ser un entero entre ${min} y ${max}.`);
  }
  return value;
}

function booleanFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  if (["true", "1", "yes"].includes(raw.toLowerCase())) return true;
  if (["false", "0", "no"].includes(raw.toLowerCase())) return false;
  throw new Error(`${name} debe ser true o false.`);
}

const password = process.env.SQL_PASSWORD || process.env.MSSQL_SA_PASSWORD;
if (!password) {
  throw new Error("Define SQL_PASSWORD o MSSQL_SA_PASSWORD en el archivo .env de la raíz.");
}

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || "development",
  host: process.env.API_HOST || "127.0.0.1",
  port: integerFromEnv("API_PORT", 3000, { min: 1, max: 65535 }),
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  sql: Object.freeze({
    server: process.env.SQL_SERVER || "127.0.0.1",
    port: integerFromEnv("SQL_PORT", 1433, { min: 1, max: 65535 }),
    database: process.env.SQL_DATABASE || "WideWorldImporters",
    user: process.env.SQL_USER || "sa",
    password,
    encrypt: booleanFromEnv("SQL_ENCRYPT", true),
    trustServerCertificate: booleanFromEnv("SQL_TRUST_SERVER_CERTIFICATE", true),
    connectionTimeout: integerFromEnv("SQL_CONNECTION_TIMEOUT_MS", 15000),
    requestTimeout: integerFromEnv("SQL_REQUEST_TIMEOUT_MS", 30000),
    pool: {
      max: integerFromEnv("SQL_POOL_MAX", 10, { min: 1, max: 100 }),
      min: integerFromEnv("SQL_POOL_MIN", 0, { min: 0, max: 100 }),
      idleTimeoutMillis: integerFromEnv("SQL_POOL_IDLE_TIMEOUT_MS", 30000),
    },
  }),
});
