import sql from "mssql";
import { config } from "./config.js";

let poolPromise;

export function getPool() {
  if (!poolPromise) {
    const pool = new sql.ConnectionPool({
      user: config.sql.user,
      password: config.sql.password,
      server: config.sql.server,
      port: config.sql.port,
      database: config.sql.database,
      connectionTimeout: config.sql.connectionTimeout,
      requestTimeout: config.sql.requestTimeout,
      pool: config.sql.pool,
      options: {
        encrypt: config.sql.encrypt,
        trustServerCertificate: config.sql.trustServerCertificate,
        useUTC: true,
      },
    });

    pool.on("error", (error) => {
      console.error("Error en el pool de SQL Server:", error.code || "SQL_POOL_ERROR");
    });

    poolPromise = pool.connect().catch((error) => {
      poolPromise = undefined;
      throw error;
    });
  }
  return poolPromise;
}

export async function executeProcedure(name, inputs = []) {
  // El nombre del procedimiento siempre proviene del código, nunca del request.
  const pool = await getPool();
  const request = pool.request();
  for (const { name: parameterName, type, value } of inputs) {
    request.input(parameterName, type, value);
  }
  return request.execute(`[app].[${name}]`);
}

export async function checkDatabase() {
  const pool = await getPool();
  await pool.request().query("SELECT 1 AS [ok]");
}

export async function closePool() {
  if (!poolPromise) return;
  const pool = await poolPromise;
  poolPromise = undefined;
  await pool.close();
}

export { sql };
