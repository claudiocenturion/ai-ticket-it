import { Compra } from "./Compra.js";
import { ErrorValidacion } from "./Errores.js";
import { EstadoCompra } from "./EstadoCompra.js";
import { Usuario } from "./Usuario.js";

export class CambioEstadoCompra {
  #fechaHora;

  constructor({ compra, estado, quien, fechaHora }) {
    if (!(compra instanceof Compra) || !(quien instanceof Usuario) || !Object.values(EstadoCompra).includes(estado)) {
      throw new ErrorValidacion("El cambio requiere una compra, un usuario y un estado válido");
    }
    if (!(fechaHora instanceof Date) || !Number.isFinite(fechaHora.getTime())) {
      throw new ErrorValidacion("La fecha del cambio de estado es inválida");
    }
    Object.assign(this, { compra, estado, quien });
    this.#fechaHora = fechaHora.getTime();
    Object.freeze(this);
  }

  get fechaHora() {
    return new Date(this.#fechaHora);
  }
}
