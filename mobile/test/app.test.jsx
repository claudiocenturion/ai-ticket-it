import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import App from "../src/App";

jest.mock("@react-native-community/datetimepicker", () => ({ __esModule: true, default: () => null }));

jest.mock("react-native-safe-area-context", () => {
  const { createElement } = require("react");
  const { View } = require("react-native");
  const Contenedor = ({ children, ...props }) => createElement(View, props, children);
  return { SafeAreaProvider: Contenedor, SafeAreaView: Contenedor };
});

jest.setTimeout(15000);

const fetchOriginal = global.fetch;
afterEach(() => { global.fetch = fetchOriginal; });

const evento = {
  id: "evento-1", nombre: "Festival", categoria: "Música", descripcion: "En vivo",
  fecha: "2099-02-01T23:00:00.000Z",
  tiposEntrada: [{ nombre: "General", precio: 500, cupo: 2, cupoDisponible: 2 }],
};
const compra = {
  id: "compra-1", eventoNombre: evento.nombre, eventoFecha: evento.fecha,
  compradorNombre: "Comprador Demo", estado: "PENDIENTE", tipoEntrada: "General",
  cantidad: 1, total: 500, puedeCancelar: true,
};

const respuesta = (datos) => ({ ok: true, json: async () => datos });
const sesionComprador = {
  token: "jwt-comprador", usuario: { id: "comprador-1", nombre: "Comprador", apellido: "Prueba", rol: "COMPRADOR" },
};
const sesionOrganizador = {
  token: "jwt-organizador", usuario: { id: "organizador-1", nombre: "Organizador", apellido: "Prueba", rol: "ORGANIZADOR" },
};
const pulsar = (name, rol = "button") => fireEvent.press(screen.getByRole(rol, { name }));
const completar = (etiqueta, valor) => fireEvent.changeText(screen.getByLabelText(etiqueta), valor);
const ingresar = async (identificador) => {
  completar("Usuario o correo", identificador);
  completar("Contraseña", "mi-contraseña");
  await act(async () => { pulsar("Ingresar"); });
};

test("App conecta la compra desde el catálogo con Mis compras y Ventas usando el cliente HTTP", async () => {
  let guardada = false;
  global.fetch = jest.fn(async (url, opciones) => {
    const { pathname } = new URL(url);
    const metodo = opciones?.method ?? "GET";
    if (pathname === "/api/compras/mensajes/pendientes") return respuesta([]);
    if (pathname === "/api/eventos/categorias") return respuesta([{ nombre: "Música" }]);
    if (pathname === "/api/auth/ingreso") {
      const datos = JSON.parse(opciones.body);
      expect(["claudio", "cine_banfield"]).toContain(datos.identificador);
      return respuesta(datos.identificador === "cine_banfield" ? sesionOrganizador : sesionComprador);
    }
    if (pathname === "/api/eventos") return respuesta([evento]);
    if (pathname === "/api/eventos/evento-1/compras" && metodo === "POST") {
      expect(opciones.headers.Authorization).toBe("Bearer jwt-comprador");
      expect(JSON.parse(opciones.body)).toEqual({ tipoEntrada: "General", cantidad: 1 });
      guardada = true;
      return respuesta(compra);
    }
    if (pathname === "/api/compras") {
      expect(opciones.headers.Authorization).toBe("Bearer jwt-comprador");
      return respuesta(guardada ? [compra] : []);
    }
    if (pathname === "/api/eventos/propios") return respuesta([{ id: evento.id, nombre: evento.nombre }]);
    if (pathname === "/api/eventos/evento-1/ventas") {
      expect(opciones.headers.Authorization).toBe("Bearer jwt-organizador");
      return respuesta({ tiposEntrada: [{ nombre: "General", cupo: 2, cupoDisponible: 1 }],
        ventas: [{ ...compra, puedeConfirmar: true }] });
    }
    throw new Error(`Ruta inesperada: ${metodo} ${pathname}`);
  });
  render(<App />);
  await ingresar("claudio");
  await screen.findByText("Festival");
  pulsar("Elegir General");
  expect(screen.getByText(/Total:/)).toBeOnTheScreen();
  await act(async () => { pulsar("Comprar entradas"); });
  pulsar("Ir a mis compras");
  await screen.findByText("Pendiente de pago");
  expect(screen.getByRole("tab", { name: "Mis compras", selected: true })).toBeOnTheScreen();

  expect(screen.queryByRole("tab", { name: "Ventas" })).toBeNull();
  await act(async () => { pulsar("Cerrar sesión"); });
  expect(screen.getByRole("button", { name: "Ingresar" })).toBeOnTheScreen();
  expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining("/auth/salir"), expect.anything());
  await ingresar("cine_banfield");
  expect(screen.getByRole("tab", { name: "Crear evento", selected: true })).toBeOnTheScreen();
  pulsar("Ventas", "tab");
  await screen.findByRole("button", { name: "Ver ventas de Festival" });
  pulsar("Ver ventas de Festival");
  await screen.findByText("General: 1 de 2 disponibles");
  expect(screen.getByRole("button", { name: "Confirmar pago simulado" })).toBeOnTheScreen();
});

test("App muestra un error de conexión y permite reintentar desde el catálogo", async () => {
  let primerCatalogo = true;
  global.fetch = jest.fn(async (url) => {
    const { pathname } = new URL(url);
    if (pathname === "/api/compras/mensajes/pendientes") return respuesta([]);
    if (pathname === "/api/auth/ingreso") return respuesta(sesionComprador);
    if (pathname === "/api/eventos/categorias") return respuesta([{ nombre: "Música" }]);
    if (primerCatalogo) {
      primerCatalogo = false;
      throw new Error("Network request failed");
    }
    return respuesta([evento]);
  });
  render(<App />);
  await ingresar("comprador@example.test");
  await screen.findByText(/No se pudo conectar con la API/);
  pulsar("Buscar");
  await screen.findByText("Festival");
});

test("El alta de organizador envía el código y la app cierra el acceso al vencer el JWT", async () => {
  global.fetch = jest.fn(async (url, opciones) => {
    const { pathname } = new URL(url);
    if (pathname === "/api/compras/mensajes/pendientes") return respuesta([]);
    if (pathname === "/api/eventos/categorias") return respuesta([{ nombre: "Música" }]);
    if (pathname === "/api/auth/registro") {
      expect(JSON.parse(opciones.body)).toEqual({
        email: "organizador@example.test", clave: "mi-contraseña", nombre: "Nombre",
        apellido: "Apellido", rol: "ORGANIZADOR", codigoOrganizador: "invitacion",
      });
      return respuesta(sesionOrganizador);
    }
    expect(pathname).toBe("/api/eventos/propios");
    expect(opciones.headers.Authorization).toBe("Bearer jwt-organizador");
    return { ok: false, status: 401, json: async () => ({ mensaje: "Sesión inválida o vencida" }) };
  });
  render(<App />);
  pulsar("Registrarme");
  completar("Nombre", "Nombre");
  completar("Apellido", "Apellido");
  completar("Correo", "organizador@example.test");
  completar("Contraseña", "mi-contraseña");
  pulsar("Registrarme como organizador");
  completar("Código de organizador", "invitacion");
  await act(async () => { pulsar("Crear cuenta"); });
  pulsar("Ventas", "tab");
  await screen.findByText("Tu sesión venció. Volvé a ingresar.");
  expect(screen.queryByRole("tab", { name: "Ventas" })).toBeNull();
});

test.each([
  ["comprador", sesionComprador, "Catálogo", "Mis compras"],
  ["organizador", sesionOrganizador, "Crear evento", "Ventas"],
])("El %s recibe un aviso fuera del chat y puede abrir la conversación", async (rol, sesion, origen, destino) => {
  jest.useFakeTimers();
  try {
    let aviso = [];
    const autor = rol === "comprador" ? "Organizador Prueba" : "Comprador Prueba";
    const mensaje = { usuario: autor, mensaje: "Cambio de horario", enviado: "2099-01-01T12:00:00.000Z" };
    global.fetch = jest.fn(async (url, opciones) => {
      const { pathname } = new URL(url);
      if (pathname === "/api/auth/ingreso") return respuesta(sesion);
      if (pathname === "/api/eventos/categorias") return respuesta([{ nombre: "Música" }]);
      if (pathname === "/api/eventos") return respuesta([evento]);
      if (pathname === "/api/compras") return respuesta([compra]);
      if (pathname === "/api/eventos/propios") return respuesta([{ id: evento.id, nombre: evento.nombre }]);
      if (pathname === "/api/eventos/evento-1/ventas") return respuesta({ tiposEntrada: [], ventas: [compra] });
      if (pathname === "/api/compras/mensajes/pendientes") return respuesta(aviso);
      if (pathname === "/api/compras/compra-1/mensajes") return respuesta([mensaje]);
      if (pathname === "/api/compras/compra-1/mensajes/lectura") {
        expect(JSON.parse(opciones.body)).toEqual({ hasta: 1 });
        aviso = [];
        return respuesta({ leidos: true });
      }
      throw new Error(`Ruta inesperada: ${pathname}`);
    });
    render(<App />);
    await ingresar(`${rol}@example.test`);
    expect(screen.getByRole("tab", { name: origen, selected: true })).toBeOnTheScreen();

    aviso = [{ compraId: compra.id, eventoId: evento.id, eventoNombre: evento.nombre, cantidad: 1, ultimo: mensaje }];
    await act(async () => { jest.advanceTimersByTime(3000); });
    expect(screen.getByText("Mensaje nuevo · Festival")).toBeOnTheScreen();
    await act(async () => { pulsar("Abrir conversación"); });
    expect(screen.getByRole("tab", { name: destino, selected: true })).toBeOnTheScreen();
    expect(screen.getByText(`${autor}: Cambio de horario`)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Abrir conversación" })).toBeNull();
  } finally {
    jest.useRealTimers();
  }
});
