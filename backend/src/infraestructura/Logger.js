const niveles = { debug: 0, info: 1, warn: 2, error: 3 };
const nombresEstado = {
  200: "OK",
  201: "Creado",
  204: "Sin contenido",
  400: "Solicitud inválida",
  401: "No autenticado",
  403: "Sin permiso",
  404: "No encontrado",
  409: "Conflicto",
  413: "Cuerpo demasiado grande",
  500: "Error interno",
};
const horaLocal = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});
const milisegundos = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

const formatoTexto = ({ fecha, nivel, evento, ...datos }) => {
  const prefijo = `[${horaLocal.format(new Date(fecha))}] ${nivel.toUpperCase().padEnd(5)}`;
  if (evento === "servidor.iniciado") {
    return `${prefijo} Backend disponible en http://localhost:${datos.puerto}`;
  }
  if (evento === "servidor.error") {
    const mensaje = datos.codigo === "EADDRINUSE" ? "El puerto ya está en uso" : "No se pudo iniciar el backend";
    return `${prefijo} ${mensaje} (puerto ${datos.puerto}${datos.codigo ? `, ${datos.codigo}` : ""})`;
  }
  if (evento === "http.solicitud" || evento === "http.interrumpida") {
    const ruta = datos.ruta?.replace(/\/$/, "") || datos.ruta || "(sin ruta asociada)";
    const estado = datos.estado === null ? "Interrumpida"
      : [datos.estado, nombresEstado[datos.estado]].filter(Boolean).join(" ");
    return `${prefijo} ${datos.metodo} ${ruta} → ${estado} | ${milisegundos.format(datos.duracionMs)} ms | id=${datos.solicitudId}`;
  }
  return `${prefijo} ${evento}${Object.keys(datos).length ? ` | ${JSON.stringify(datos)}` : ""}`;
};

export class Logger {
  constructor({ salida = console, formato = "texto", nivel = "info" } = {}) {
    if (!Object.hasOwn(niveles, nivel)) throw new Error("AI_TICKET_LOG_LEVEL debe ser debug, info, warn o error");
    if (!["texto", "json"].includes(formato)) throw new Error("AI_TICKET_LOG_FORMAT debe ser texto o json");
    this.salida = salida;
    this.formato = formato;
    this.nivel = nivel;
  }

  debug(evento, datos) {
    this.#escribir("debug", evento, datos);
  }

  info(evento, datos) {
    this.#escribir("info", evento, datos);
  }

  warn(evento, datos) {
    this.#escribir("warn", evento, datos);
  }

  error(evento, datos) {
    this.#escribir("error", evento, datos);
  }

  #escribir(nivel, evento, datos) {
    if (niveles[nivel] < niveles[this.nivel]) return;
    const registro = { ...datos, fecha: new Date().toISOString(), nivel, evento };
    this.salida[nivel](this.formato === "json" ? JSON.stringify(registro) : formatoTexto(registro));
  }
}
