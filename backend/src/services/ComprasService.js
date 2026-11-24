import { Compra } from "../dominio/Compra.js";
import { ErrorConflicto, ErrorNoEncontrado, ErrorPermiso } from "../dominio/Errores.js";
import { esquemaCompra } from "../validaciones/compras.js";
import { validarEsquema } from "../validaciones/validarEsquema.js";

export class ComprasService {
  constructor(eventos, compras, reloj = Date.now) {
    this.eventos = eventos;
    this.compras = compras;
    this.reloj = reloj;
  }

  comprar(eventoId, { tipoEntrada, cantidad } = {}, usuario) {
    const entrada = validarEsquema(esquemaCompra, {
      params: { eventoId },
      body: { tipoEntrada, cantidad },
    });
    if (usuario?.rol !== "COMPRADOR") {
      throw new ErrorPermiso("Solo un comprador puede comprar entradas");
    }
    const evento = this.eventos.obtener(entrada.params.eventoId);
    if (!evento) throw new ErrorNoEncontrado("Evento inexistente");
    if (evento.fecha.getTime() <= this.reloj()) {
      throw new ErrorConflicto("El evento ya comenzó");
    }
    const tipo = evento.tiposEntrada.find(({ nombre }) => nombre === entrada.body.tipoEntrada);
    if (!tipo) throw new ErrorNoEncontrado("Tipo de entrada inexistente");

    // La consulta de cupo y el registro son síncronos en el mismo proceso.
    const cantidadComprada = this.compras.cantidadComprada(evento.id, tipo.nombre);
    return this.compras.guardar(new Compra({
      comprador: usuario, evento, tipoEntrada: tipo,
      cantidad: entrada.body.cantidad, cantidadComprada,
    }));
  }
}
