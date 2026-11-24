import { randomUUID } from "node:crypto";

export class EventosEnMemoria {
  #eventos = new Map();

  guardar(evento) {
    evento.asignarId(randomUUID());
    this.#eventos.set(evento.id, evento);
    return evento;
  }

  listar() {
    return [...this.#eventos.values()];
  }

  obtener(id) {
    return this.#eventos.get(id);
  }
}


