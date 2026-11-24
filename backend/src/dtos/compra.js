export const salidaCompra = ({ id, comprador, evento, tipoEntrada, cantidad, total, estado }) => ({
  id, compradorId: comprador.id, eventoId: evento.id, tipoEntrada: tipoEntrada.nombre,
  cantidad, precioUnitario: tipoEntrada.precio, total, estado,
});

export const salidaCompraGestion = ({ compra, ...opciones }) => ({
  ...salidaCompra(compra),
  eventoNombre: compra.evento.nombre,
  eventoFecha: compra.evento.fecha.toISOString(),
  compradorNombre: `${compra.comprador.nombre} ${compra.comprador.apellido}`,
  ...opciones,
});

export const salidaMensaje = ({ usuario, mensaje, enviado }) => ({
  usuario: `${usuario.nombre} ${usuario.apellido}`, mensaje, enviado: enviado.toISOString(),
});

export const salidaNotificacionMensaje = ({ compra, cantidad, ultimo }) => ({
  compraId: compra.id, eventoId: compra.evento.id, eventoNombre: compra.evento.nombre,
  cantidad, ultimo: salidaMensaje(ultimo),
});
