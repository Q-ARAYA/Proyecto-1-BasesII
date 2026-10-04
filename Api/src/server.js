import { app } from "./app.js";
import { closePool } from "./db.js";
import { config } from "./config.js";

const server = app.listen(config.port, config.host, () => {
  console.log(`API escuchando en http://${config.host}:${config.port}`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Señal ${signal}; cerrando la API...`);
  server.close(async (error) => {
    try {
      await closePool();
    } catch (closeError) {
      console.error("No se pudo cerrar el pool SQL:", closeError.code || "SQL_CLOSE_ERROR");
      process.exitCode = 1;
    }
    if (error) {
      console.error("No se pudo cerrar el servidor HTTP:", error.code || "HTTP_CLOSE_ERROR");
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
