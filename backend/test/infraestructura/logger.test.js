import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { Logger } from "../../src/infraestructura/Logger.js";
import { registrarSolicitudes } from "../../src/middlewares/registrarSolicitudes.js";

const prepararLogger = (opciones) => {
  const lineas = [];
  const escribir = (linea) => lineas.push(linea);
  const logger = new Logger({
    salida: { debug: escribir, info: escribir, warn: escribir, error: escribir },
    ...opciones,
  });
  return { logger, lineas };
};

test("El logger muestra el arranque, estado HTTP y duración en formato legible", () => {
  const { logger, lineas } = prepararLogger();
  logger.info("servidor.iniciado", { puerto: 8000 });
  logger.warn("http.solicitud", {
    metodo: "POST", ruta: "/api/eventos/", estado: 403, duracionMs: 2.41, solicitudId: "solicitud-1",
  });
  assert.match(lineas[0], /INFO\s+Backend disponible en http:\/\/localhost:8000/);
  assert.match(lineas[1], /WARN\s+POST \/api\/eventos → 403 Sin permiso \| 2,41 ms \| id=solicitud-1$/);
});

const finalizarConsultaChat = (logger, estado) => {
  const req = { method: "GET", route: { path: "/:compraId/mensajes" } };
  const res = new EventEmitter();
  Object.assign(res, { statusCode: estado, locals: { prefijoRuta: "/api/compras" }, set() {} });
  registrarSolicitudes(logger)(req, res, () => res.emit("finish"));
};

test("Las consultas automáticas exitosas solo aparecen en debug y los errores siguen visibles", () => {
  const normal = prepararLogger();
  finalizarConsultaChat(normal.logger, 200);
  finalizarConsultaChat(normal.logger, 401);
  finalizarConsultaChat(normal.logger, 500);
  assert.equal(normal.lineas.length, 2);
  assert.match(normal.lineas[0], /WARN\s+GET \/api\/compras\/:compraId\/mensajes → 401/);
  assert.match(normal.lineas[1], /ERROR\s+GET \/api\/compras\/:compraId\/mensajes → 500/);

  const detallado = prepararLogger({ formato: "json", nivel: "debug" });
  finalizarConsultaChat(detallado.logger, 200);
  const [registro] = detallado.lineas.map(JSON.parse);
  assert.equal(registro.nivel, "debug");
  assert.equal(registro.estado, 200);
});
