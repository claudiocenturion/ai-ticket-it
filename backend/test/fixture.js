import { Usuario } from "../src/dominio/Usuario.js";

export const usuarioPrueba = (id, rol) => {
  const usuario = new Usuario({ nombre: "Nombre", apellido: rol, rol });
  usuario.asignarId(id);
  return usuario;
};
export const organizador = usuarioPrueba("organizador-1", "ORGANIZADOR");
export const comprador = usuarioPrueba("comprador-1", "COMPRADOR");
export const codigoOrganizador = "codigo-organizador-para-pruebas";

export const registrarCuenta = async (url, rol) => {
  const respuesta = await fetch(`${url}/api/auth/registro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre: "Nombre", apellido: rol, email: `${rol.toLowerCase()}@example.test`,
      clave: "clave-para-pruebas", rol, codigoOrganizador,
    }),
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje);
  return datos;
};
export const reloj = () => Date.parse("2030-01-01T00:00:00.000Z");
export const datosEvento = (cambios = {}) => ({
  nombre: "Festival de Música",
  descripcion: "Jazz y conciertos al aire libre",
  categoria: "Música",
  fecha: "2030-02-01T23:00:00.000Z",
  tiposEntrada: [
    { nombre: "General", precio: 10000, cupo: 100 },
    { nombre: "VIP", precio: 30000, cupo: 10 },
  ],
  ...cambios,
});
