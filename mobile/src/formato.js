const pesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export const formatearPrecio = (precio) => pesos.format(precio);
export const formatearFecha = (fecha) => new Date(fecha).toLocaleString("es-AR", {
  dateStyle: "medium", timeStyle: "short",
});
