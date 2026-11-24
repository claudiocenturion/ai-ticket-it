import { EstadoCompra } from "../dominio/EstadoCompra.js";
import { ErrorConflicto, ErrorNoEncontrado } from "../dominio/Errores.js";
import { Resenia } from "../dominio/Resenia.js";
import { esquemaId } from "../validaciones/compras.js";
import { esquemaResenia } from "../validaciones/resenias.js";
import { validarEsquema } from "../validaciones/validarEsquema.js";

export class ReseniasService {
  constructor(eventos, gestionCompras, repositorio, reloj) {
    Object.assign(this, { eventos, gestionCompras, repositorio, reloj });
  }

  publicar(compraId, { detalle, puntuacion } = {}, usuario) {
    const entrada = validarEsquema(esquemaResenia, { detalle, puntuacion });
    const compra = this.gestionCompras.obtenerDeComprador(compraId, usuario);
    if (compra.estado !== EstadoCompra.UTILIZADA || compra.evento.fechaFin > this.reloj()) {
      throw new ErrorConflicto("Podés reseñar con una entrada utilizada cuando termine el evento");
    }
    if (this.repositorio.existe(usuario.id, compra.evento.id)) {
      throw new ErrorConflicto("Ya publicaste una reseña para este evento");
    }
    return this.repositorio.guardar(new Resenia({ ...entrada, comprador: usuario, evento: compra.evento }));
  }

  anteriores(eventoId) {
    const id = validarEsquema(esquemaId, eventoId);
    const evento = this.eventos.obtener(id);
    if (!evento) throw new ErrorNoEncontrado("Evento inexistente");
    return this.repositorio.anterioresA(evento);
  }
}
