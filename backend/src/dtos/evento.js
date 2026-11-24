export const salidaEvento = (
  { id, organizador, nombre, descripcion, categoria, fecha, fechaFin, multimedia, tiposEntrada },
) => ({
  id, organizadorId: organizador.id, nombre, descripcion, categoria: categoria.nombre,
  fecha: fecha.toISOString(), fechaFin: fechaFin.toISOString(), imagenUrl: multimedia[0] ?? null,
  tiposEntrada: tiposEntrada.map((tipo) => ({
    nombre: tipo.nombre, precio: tipo.precio, cupo: tipo.cupo, cupoDisponible: tipo.cupoDisponible,
  })),
});

export const salidaCategoria = ({ nombre, descripcion }) => ({ nombre, descripcion });
