export const salidaResenia = ({ id, comprador, evento, detalle, puntuacion }) => ({
  id, eventoNombre: evento.nombre, compradorNombre: `${comprador.nombre} ${comprador.apellido}`,
  detalle, puntuacion,
});
