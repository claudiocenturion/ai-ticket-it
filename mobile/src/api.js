const base = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

const solicitar = async (ruta, opciones) => {
  let respuesta;
  try {
    respuesta = await fetch(`${base}/api${ruta}`, opciones);
  } catch {
    throw new Error("No se pudo conectar con la API. Revisá la dirección del backend y tu conexión.");
  }
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    const error = new Error(datos?.mensaje || "No se pudo completar la operación");
    error.estado = respuesta.status;
    throw error;
  }
  if (datos === null) throw new Error("La API devolvió una respuesta inválida");
  return datos;
};

const opcionesHttp = (method, datos, token) => ({
  method,
  headers: {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(datos !== undefined && { "Content-Type": "application/json" }),
  },
  ...(datos !== undefined && { body: JSON.stringify(datos) }),
});

const enviar = (ruta, datos) => solicitar(ruta, opcionesHttp("POST", datos));
const rutaCompra = (id) => `/compras/${encodeURIComponent(id)}`;
const rutaEvento = (id) => `/eventos/${encodeURIComponent(id)}`;

export const acceso = {
  ingresar: (datos) => enviar("/auth/ingreso", datos),
  registrar: (datos) => enviar("/auth/registro", datos),
};

export const crearApi = (token, alVencer) => {
  const autenticada = async (ruta, method = "GET", datos) => {
    try {
      return await solicitar(ruta, opcionesHttp(method, datos, token));
    } catch (error) {
      if (error.estado === 401) alVencer();
      throw error;
    }
  };
  return {
    categorias: () => solicitar("/eventos/categorias"),
    comprar: (eventoId, datos) => autenticada(`${rutaEvento(eventoId)}/compras`, "POST", datos),
    buscar: ({ texto, categoria, orden }) => solicitar(
      `/eventos?texto=${encodeURIComponent(texto)}&categoria=${encodeURIComponent(categoria)}`
        + (orden ? `&orden=${encodeURIComponent(orden)}` : ""),
    ),
    crear: (datos) => autenticada("/eventos", "POST", datos),
    misCompras: () => autenticada("/compras"),
    misEventos: () => autenticada("/eventos/propios"),
    ventas: (eventoId) => autenticada(`${rutaEvento(eventoId)}/ventas`),
    mensajes: (id) => autenticada(`${rutaCompra(id)}/mensajes`),
    notificacionesMensajes: () => autenticada("/compras/mensajes/pendientes"),
    marcarMensajesLeidos: (id, hasta) => autenticada(`${rutaCompra(id)}/mensajes/lectura`, "POST", { hasta }),
    enviarMensaje: (id, mensaje) => autenticada(`${rutaCompra(id)}/mensajes`, "POST", { mensaje }),
    cancelar: (id) => autenticada(`${rutaCompra(id)}/cancelacion`, "POST"),
    cambiarEstado: (id, estado) => autenticada(`${rutaCompra(id)}/estado`, "PATCH", { estado }),
    reseniar: (id, datos) => autenticada(`${rutaCompra(id)}/resenia`, "POST", datos),
    resenias: (eventoId) => solicitar(`${rutaEvento(eventoId)}/resenias`),
  };
};
