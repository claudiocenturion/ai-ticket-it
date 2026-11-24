import { ErrorConflicto, ErrorValidacion } from "./Errores.js";

export class TipoEntrada {
  constructor({ nombre, descripcion = "", precio, cupo }) {
    if (typeof nombre !== "string" || !nombre.trim()) {
      throw new ErrorValidacion("El tipo de entrada necesita un nombre");
    }
    if (!Number.isFinite(precio) || precio < 0) {
      throw new ErrorValidacion("El precio debe ser un número no negativo");
    }
    if (typeof descripcion !== "string") throw new ErrorValidacion("La descripción debe ser texto");
    if (!Number.isSafeInteger(cupo) || cupo < 1) {
      throw new ErrorValidacion("El cupo debe ser un entero positivo");
    }
    this.nombre = nombre.trim();
    this.descripcion = descripcion.trim();
    this.precio = precio;
    this.cupo = cupo;
    Object.freeze(this);
  }

  verificarDisponibilidad(cantidad, cantidadComprada) {
    if (!Number.isSafeInteger(cantidad) || cantidad < 1) {
      throw new ErrorValidacion("La cantidad debe ser un entero positivo");
    }
    if (!Number.isSafeInteger(cantidadComprada) || cantidadComprada < 0) {
      throw new ErrorValidacion("La cantidad comprada es inválida");
    }
    if (!this.hayCupoPara(cantidad, cantidadComprada)) {
      throw new ErrorConflicto("Cupo insuficiente");
    }
  }

  hayCupoPara(cantidad, cantidadComprada = 0) {
    return Number.isSafeInteger(cantidad) && cantidad > 0
      && Number.isSafeInteger(cantidadComprada) && cantidadComprada >= 0
      && cantidad <= this.cupo - cantidadComprada;
  }
}

