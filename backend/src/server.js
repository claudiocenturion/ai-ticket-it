import { crearApp } from "./app.js";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
import { Logger } from "./infraestructura/Logger.js";
import { crearUsuariosIniciales } from "./configuracion/cuentasIniciales.js";
import { cargarFuncionesIniciales } from "./configuracion/funcionesIniciales.js";

try {
  process.loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const puerto = Number(process.env.PORT ?? 8000);
const interfaces = Object.values(networkInterfaces()).flat();
const hosts = ["localhost", ...interfaces.filter(({ family }) => family === "IPv4").map(({ address }) => address)];
const origenesWeb = hosts.map((host) => `http://${host}:8081`);
const logger = new Logger({
  formato: process.env.AI_TICKET_LOG_FORMAT || undefined,
  nivel: process.env.AI_TICKET_LOG_LEVEL || undefined,
});
const servidor = crearApp({
  secretoJwt: process.env.JWT_SECRET || undefined,
  codigoOrganizador: process.env.CODIGO_ALTA_ORGANIZADOR,
  usuarios: crearUsuariosIniciales(),
  precargarEventos: cargarFuncionesIniciales,
  origenesWeb, logger,
}).listen(puerto, "0.0.0.0");

servidor.once("listening", () => {
  logger.info("servidor.iniciado", { puerto: servidor.address().port });
});

servidor.on("error", (error) => {
  logger.error("servidor.error", { puerto, codigo: error.code });
  process.exitCode = 1;
});

