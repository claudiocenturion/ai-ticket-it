import { ErrorAplicacion } from "../dominio/ErrorAplicacion.js";
import { ErrorNoEncontrado } from "../dominio/Errores.js";

export const rutaInexistente = (req, res, next) => {
  next(new ErrorNoEncontrado("Ruta inexistente"));
};

export const manejarErrores = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof ErrorAplicacion) return res.status(error.estado).json({ mensaje: error.message });
  if (error.type === "entity.parse.failed") return res.status(400).json({ mensaje: "JSON inválido" });
  if (error.type === "entity.too.large") return res.status(413).json({ mensaje: "El cuerpo supera el tamaño permitido" });
  return res.status(500).json({ mensaje: "Error interno" });
};
