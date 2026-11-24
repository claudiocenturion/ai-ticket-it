import { ErrorConflicto, ErrorValidacion } from "./Errores.js";
import { TipoEntrada } from "./TipoEntrada.js";
import { Entidad } from "./Entidad.js";
import { EstadoCompra } from "./EstadoCompra.js";
import { Evento } from "./Evento.js";
import { Mensaje } from "./Mensaje.js";
import { Usuario } from "./Usuario.js";

const transiciones = {
  [EstadoCompra.PENDIENTE]: [EstadoCompra.CONFIRMADA, EstadoCompra.CANCELADA],
  [EstadoCompra.CONFIRMADA]: [EstadoCompra.UTILIZADA, EstadoCompra.REEMBOLSADA],
};

export class Compra extends Entidad {
  #estado = EstadoCompra.PENDIENTE;
  #mensajes;
  #lecturas = new Map();

  constructor({ comprador, evento, tipoEntrada, cantidad, cantidadComprada = 0, mensajes = [] }) {
    super();
    if (!(comprador instanceof Usuario) || !(evento instanceof Evento)) {
      throw new ErrorValidacion("La compra requiere un comprador y un evento");
    }
    if (!(tipoEntrada instanceof TipoEntrada) || !evento.tiposEntrada.includes(tipoEntrada)) {
      throw new ErrorValidacion("El tipo de entrada debe pertenecer al evento");
    }
    if (!Array.isArray(mensajes) || mensajes.some((mensaje) => !(mensaje instanceof Mensaje))) {
      throw new ErrorValidacion("La compra requiere mensajes válidos");
    }
    tipoEntrada.verificarDisponibilidad(cantidad, cantidadComprada);
    const total = tipoEntrada.precio * cantidad;
    if (!Number.isFinite(total)) throw new ErrorValidacion("El total de la compra es inválido");

    Object.assign(this, { comprador, evento, tipoEntrada, cantidad, total });
    this.#mensajes = [...mensajes];
    Object.freeze(this);
  }

  get estado() {
    return this.#estado;
  }

  actualizarEstado(estado) {
    if (!Object.values(EstadoCompra).includes(estado)) {
      throw new ErrorValidacion("El estado de la compra es inválido");
    }
    if (!transiciones[this.#estado]?.includes(estado)) {
      throw new ErrorConflicto("La compra no admite ese cambio de estado");
    }
    this.#estado = estado;
  }

  get mensajes() {
    return Object.freeze([...this.#mensajes]);
  }

  agregarMensaje(mensaje) {
    if (!(mensaje instanceof Mensaje)) throw new ErrorValidacion("El mensaje es inválido");
    this.#mensajes.push(mensaje);
  }

  mensajesPendientes(usuarioId) {
    return this.#mensajes.slice(this.#lecturas.get(usuarioId) ?? 0)
      .filter(({ usuario }) => usuario.id !== usuarioId);
  }

  marcarMensajesLeidos(usuarioId, hasta) {
    if (!Number.isSafeInteger(hasta) || hasta < 0 || hasta > this.#mensajes.length) {
      throw new ErrorValidacion("El número de mensajes leídos es inválido");
    }
    const anterior = this.#lecturas.get(usuarioId) ?? 0;
    if (hasta > anterior) this.#lecturas.set(usuarioId, hasta);
  }

  get reservaCupo() {
    return this.#estado !== EstadoCompra.CANCELADA && this.#estado !== EstadoCompra.REEMBOLSADA;
  }
}
