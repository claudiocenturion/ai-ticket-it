import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

const rutasDelChat = new Set(["/api/compras/mensajes/pendientes", "/api/compras/:compraId/mensajes"]);

export const registrarSolicitudes = (logger) => (req, res, next) => {
  const solicitudId = randomUUID();
  const inicio = performance.now();
  res.set("X-Request-Id", solicitudId);

  const registrar = (terminada) => {
    const estado = terminada ? res.statusCode : null;
    const ruta = req.route ? `${res.locals.prefijoRuta ?? ""}${req.route.path}` : null;
    const consultaAutomatica = req.method === "OPTIONS" || (req.method === "GET" && rutasDelChat.has(ruta));
    const nivel = estado >= 500 ? "error"
      : !terminada || estado >= 400 ? "warn"
        : consultaAutomatica ? "debug" : "info";
    logger[nivel](terminada ? "http.solicitud" : "http.interrumpida", {
      solicitudId, metodo: req.method,
      ruta,
      estado, duracionMs: Math.round((performance.now() - inicio) * 100) / 100,
    });
  };
  res.once("finish", () => registrar(true));
  res.once("close", () => {
    if (!res.writableFinished) registrar(false);
  });
  next();
};
