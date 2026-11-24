import { ErrorValidacion } from "./Errores.js";
import { TipoEntrada } from "./TipoEntrada.js";
import { Categoria } from "./Categoria.js";
import { Entidad } from "./Entidad.js";
import { Usuario } from "./Usuario.js";

export class Evento extends Entidad {
  #fecha;
  #fechaFin;

  constructor({ organizador, nombre, descripcion, categoria, fecha, fechaFin = fecha, multimedia = [], tiposEntrada }) {
    super();
    if (!(organizador instanceof Usuario) || !(categoria instanceof Categoria)) {
      throw new ErrorValidacion("El evento requiere un organizador y una categoría");
    }
    const campos = { nombre, descripcion };
    for (const [campo, valor] of Object.entries(campos)) {
      if (typeof valor !== "string" || !valor.trim()) {
        throw new ErrorValidacion(`El campo ${campo} es obligatorio`);
      }
      this[campo] = valor.trim();
    }
    if (!(fecha instanceof Date) || !Number.isFinite(fecha.getTime())) {
      throw new ErrorValidacion("La fecha debe ser válida y estar en formato ISO UTC");
    }
    if (!(fechaFin instanceof Date) || !Number.isFinite(fechaFin.getTime()) || fechaFin < fecha) {
      throw new ErrorValidacion("El fin del evento debe ser igual o posterior al inicio");
    }
    if (!Array.isArray(multimedia) || multimedia.some((url) =>
      typeof url !== "string" || !["http:", "https:"].includes(URL.parse(url)?.protocol))) {
      throw new ErrorValidacion("La imagen debe tener una URL HTTP o HTTPS válida");
    }
    if (!Array.isArray(tiposEntrada) || !tiposEntrada.length) {
      throw new ErrorValidacion("El evento necesita al menos un tipo de entrada");
    }
    const entradas = tiposEntrada.map((tipo) => new TipoEntrada(tipo));
    if (new Set(entradas.map(({ nombre }) => nombre.toLowerCase())).size !== entradas.length) {
      throw new ErrorValidacion("Los nombres de los tipos de entrada deben ser únicos");
    }
    this.#fecha = fecha.getTime();
    this.#fechaFin = fechaFin.getTime();
    this.organizador = organizador;
    this.categoria = categoria;
    this.multimedia = Object.freeze([...multimedia]);
    this.tiposEntrada = Object.freeze(entradas);
    Object.freeze(this);
  }

  get fecha() {
    return new Date(this.#fecha);
  }

  get fechaFin() {
    return new Date(this.#fechaFin);
  }

  tuPrecioEstaEntre(minimo, maximo) {
    return this.tiposEntrada.some(({ precio }) => precio >= minimo && precio <= maximo);
  }
}

