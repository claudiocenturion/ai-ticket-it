import { ErrorValidacion } from "./Errores.js";

export class Entidad {
  #id;

  get id() {
    return this.#id;
  }

  asignarId(id) {
    if (this.#id !== undefined || typeof id !== "string" || !id.trim()) {
      throw new ErrorValidacion("Solo se puede asignar una identidad válida una vez");
    }
    this.#id = id;
  }
}
