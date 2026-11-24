import { randomUUID } from "node:crypto";

export class ComprasEnMemoria {
  #compras = new Map();
  #cambios = [];

  guardar(compra) {
    compra.asignarId(randomUUID());
    this.#compras.set(compra.id, compra);
    return compra;
  }

  cantidadComprada(eventoId, tipoEntrada) {
    let cantidad = 0;
    for (const compra of this.#compras.values()) {
      if (compra.reservaCupo && compra.evento.id === eventoId && compra.tipoEntrada.nombre === tipoEntrada) {
        cantidad += compra.cantidad;
      }
    }
    return cantidad;
  }

  obtener(id) {
    return this.#compras.get(id);
  }

  listarPorComprador(compradorId) {
    return [...this.#compras.values()].filter((compra) => compra.comprador.id === compradorId);
  }

  listarPorEvento(eventoId) {
    return [...this.#compras.values()].filter((compra) => compra.evento.id === eventoId);
  }

  listarPorOrganizador(organizadorId) {
    return [...this.#compras.values()].filter(({ evento }) => evento.organizador.id === organizadorId);
  }

  registrarCambio(cambio) {
    this.#cambios.push(cambio);
  }

  listarCambios(compraId) {
    return this.#cambios.filter(({ compra }) => compra.id === compraId);
  }
}

