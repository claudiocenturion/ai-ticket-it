import { randomUUID } from "node:crypto";

export class ReseniasEnMemoria {
  #resenias = new Map();

  guardar(resenia) {
    resenia.asignarId(randomUUID());
    this.#resenias.set(resenia.id, resenia);
    return resenia;
  }

  existe(compradorId, eventoId) {
    return [...this.#resenias.values()].some(({ comprador, evento }) =>
      comprador.id === compradorId && evento.id === eventoId);
  }

  anterioresA(evento) {
    return [...this.#resenias.values()].filter((resenia) =>
      resenia.evento.id !== evento.id && resenia.evento.organizador.id === evento.organizador.id
      && resenia.evento.fechaFin <= evento.fecha);
  }
}
