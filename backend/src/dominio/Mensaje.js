import { ErrorValidacion } from "./Errores.js";
import { Usuario } from "./Usuario.js";

export class Mensaje {
  #enviado;

  constructor({ usuario, mensaje, enviado }) {
    if (!(usuario instanceof Usuario) || typeof mensaje !== "string" || !mensaje.trim()) {
      throw new ErrorValidacion("El mensaje requiere un usuario y texto");
    }
    if (!(enviado instanceof Date) || !Number.isFinite(enviado.getTime())) {
      throw new ErrorValidacion("La fecha de envío del mensaje es inválida");
    }
    this.usuario = usuario;
    this.mensaje = mensaje.trim();
    this.#enviado = enviado.getTime();
    Object.freeze(this);
  }

  get enviado() {
    return new Date(this.#enviado);
  }
}
