import { ZodError } from "zod";
import { ErrorValidacion } from "../dominio/Errores.js";

export const validarEsquema = (esquema, datos) => {
  try {
    return esquema.parse(datos);
  } catch (error) {
    if (error instanceof ZodError) throw new ErrorValidacion(error.issues[0].message);
    throw error;
  }
};
