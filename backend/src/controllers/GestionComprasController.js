import { salidaCompra, salidaCompraGestion, salidaMensaje, salidaNotificacionMensaje } from "../dtos/compra.js";
import { salidaResenia } from "../dtos/resenia.js";

const responder = (operacion, estado = 200) => (req, res, next) => {
  try {
    res.status(estado).json(operacion(req, res.locals.usuario));
  } catch (error) {
    next(error);
  }
};

export class GestionComprasController {
  constructor(compras, resenias) {
    this.compras = compras;
    this.resenias = resenias;
  }

  propias = responder((req, usuario) => this.compras.listarPropias(usuario).map(salidaCompraGestion));

  eventosPropios = responder((req, usuario) => this.compras.listarEventosPropios(usuario)
    .map(({ id, nombre }) => ({ id, nombre })));

  ventas = responder((req, usuario) => {
    const { tiposEntrada, ventas } = this.compras.listarVentas(req.params.eventoId, usuario);
    return { tiposEntrada, ventas: ventas.map(salidaCompraGestion) };
  });

  mensajes = responder((req, usuario) => this.compras.listarMensajes(req.params.compraId, usuario).map(salidaMensaje));

  notificacionesMensajes = responder((req, usuario) =>
    this.compras.notificacionesMensajes(usuario).map(salidaNotificacionMensaje));

  leerMensajes = responder((req, usuario) => {
    this.compras.marcarMensajesLeidos(req.params.compraId, req.body, usuario);
    return { leidos: true };
  });

  enviarMensaje = responder((req, usuario) =>
    salidaMensaje(this.compras.enviarMensaje(req.params.compraId, req.body, usuario)), 201);

  cancelar = responder((req, usuario) => salidaCompra(this.compras.cancelar(req.params.compraId, usuario)));

  cambiarVenta = responder((req, usuario) =>
    salidaCompra(this.compras.cambiarVenta(req.params.compraId, req.body, usuario)));

  publicarResenia = responder((req, usuario) =>
    salidaResenia(this.resenias.publicar(req.params.compraId, req.body, usuario)), 201);

  reseniasAnteriores = responder((req) => this.resenias.anteriores(req.params.eventoId).map(salidaResenia));
}
