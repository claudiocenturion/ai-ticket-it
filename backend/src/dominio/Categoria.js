import { ErrorValidacion } from "./Errores.js";

export class Categoria {
  constructor({ nombre, descripcion = "" }) {
    if (typeof nombre !== "string" || !nombre.trim() || typeof descripcion !== "string") {
      throw new ErrorValidacion("La categoría requiere un nombre y una descripción de texto");
    }
    Object.assign(this, { nombre: nombre.trim(), descripcion: descripcion.trim() });
    Object.freeze(this);
  }
}
