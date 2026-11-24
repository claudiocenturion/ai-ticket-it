import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";
import { Catalogo } from "../src/pantallas/Catalogo";
import { CrearEvento } from "../src/pantallas/CrearEvento";
import { Acceso } from "../src/pantallas/Acceso";

jest.mock("@react-native-community/datetimepicker", () => {
  const { createElement } = require("react");
  const { View } = require("react-native");
  return { __esModule: true, default: (props) => createElement(View, props) };
});

const categorias = jest.fn().mockResolvedValue([{ nombre: "Música" }, { nombre: "Teatro" }]);
const pulsar = (name) => fireEvent.press(screen.getByRole("button", { name }));
const elegirFecha = (name, fecha) => {
  pulsar(name);
  fireEvent(screen.getByTestId("selector-nativo"), "onChange", { type: "set" }, fecha);
  if (Platform.OS === "ios") pulsar("Confirmar selección");
};

test("El registro muestra errores de correo y contraseña antes de llamar a la API", () => {
  const api = { ingresar: jest.fn(), registrar: jest.fn() };
  render(<Acceso api={api} iniciar={jest.fn()} />);
  const pulsar = (name) => fireEvent.press(screen.getByRole("button", { name }));
  const completar = (etiqueta, valor) => fireEvent.changeText(screen.getByLabelText(etiqueta), valor);

  pulsar("Registrarme");
  completar("Nombre", "Ada");
  completar("Apellido", "López");
  completar("Correo", "correo inválido");
  completar("Contraseña", "corta");
  pulsar("Crear cuenta");
  expect(screen.getByText("Ingresá un correo válido.")).toBeOnTheScreen();
  expect(screen.getByText("Usá al menos 8 caracteres.")).toBeOnTheScreen();
  expect(screen.getByRole("alert")).toHaveTextContent("Revisá los campos marcados.");
  expect(api.registrar).not.toHaveBeenCalled();
  pulsar("Mostrar contraseña");
  expect(screen.getByLabelText("Contraseña").props.secureTextEntry).toBe(false);
});

test("CU04 exige elegir categoría, fecha y hora, y acepta el precio con coma", async () => {
  const api = { crear: jest.fn().mockResolvedValue({}), categorias };
  render(<CrearEvento api={api} />);
  const completar = (etiqueta, valor) => fireEvent.changeText(screen.getByLabelText(etiqueta), valor);
  const publicar = () => fireEvent.press(screen.getByRole("button", { name: "Publicar evento" }));
  completar("Nombre", "Festival");
  completar("Descripción", "Música en vivo");
  await screen.findByRole("button", { name: "Música" });
  completar("Tipo 1", "General");
  completar("Precio 1", "7500,50");
  completar("Cupo 1", "1,5");
  publicar();
  expect(screen.getByText("Elegí una categoría.")).toBeOnTheScreen();
  expect(screen.getByText("Elegí la fecha y la hora de inicio.")).toBeOnTheScreen();
  expect(screen.getByText("Ingresá un cupo entero mayor que cero.")).toBeOnTheScreen();
  expect(api.crear).not.toHaveBeenCalled();

  const inicio = new Date(2099, 1, 1, 20, 0);
  pulsar("Música");
  elegirFecha("Elegir fecha de inicio", inicio);
  elegirFecha("Elegir hora de inicio", inicio);
  completar("Cupo 1", "100");
  publicar();
  await screen.findByText("Evento publicado");
  expect(api.crear).toHaveBeenCalledWith(expect.objectContaining({
    categoria: "Música", fecha: inicio.toISOString(),
    tiposEntrada: [{ nombre: "General", precio: 7500.5, cupo: 100 }],
  }));
});

test("CU04 permite publicar un evento con dos tipos de entrada", async () => {
  const api = { crear: jest.fn().mockResolvedValue({}), categorias };
  render(<CrearEvento api={api} />);
  const completar = (etiqueta, valor) => fireEvent.changeText(screen.getByLabelText(etiqueta), valor);

  completar("Nombre", "Festival");
  completar("Descripción", "Música en vivo");
  await screen.findByRole("button", { name: "Música" });
  pulsar("Música");
  const inicio = new Date(2099, 1, 1, 20, 0);
  elegirFecha("Elegir fecha de inicio", inicio);
  elegirFecha("Elegir hora de inicio", inicio);
  const fin = new Date(2099, 1, 1, 22, 0);
  elegirFecha("Elegir fecha de fin", fin);
  elegirFecha("Elegir hora de fin", fin);
  completar("Tipo 1", "General");
  completar("Precio 1", "5000");
  completar("Cupo 1", "100");
  fireEvent.press(screen.getByRole("button", { name: "Agregar tipo de entrada" }));
  completar("Tipo 2", "VIP");
  completar("Precio 2", "7500,50");
  completar("Cupo 2", "10");
  fireEvent.press(screen.getByRole("button", { name: "Publicar evento" }));

  await screen.findByText("Evento publicado");
  expect(api.crear).toHaveBeenCalledWith(expect.objectContaining({
    nombre: "Festival",
    fecha: inicio.toISOString(), fechaFin: fin.toISOString(),
    tiposEntrada: [{ nombre: "General", precio: 5000, cupo: 100 }, { nombre: "VIP", precio: 7500.5, cupo: 10 }],
  }));
});

test("CU03 envía texto y categoría y muestra el resultado de la API", async () => {
  const evento = { id: "1", nombre: "Festival de Jazz", categoria: "Música", fecha: "2030-02-01T23:00:00.000Z", tiposEntrada: [] };
  const api = { buscar: jest.fn().mockResolvedValueOnce([evento]).mockResolvedValue([]), categorias };
  render(<Catalogo api={api} />);

  await screen.findByText("Festival de Jazz");
  await screen.findByRole("button", { name: "Música" });
  fireEvent.changeText(screen.getByLabelText("Buscar eventos"), "rock");
  fireEvent.press(screen.getByRole("button", { name: "Música" }));

  await waitFor(() => expect(api.buscar).toHaveBeenLastCalledWith({ texto: "rock", categoria: "Música" }));
  await screen.findByText("No se encontraron eventos");
});

test("CU03 permite explorar una categoría incluso con el catálogo vacío", async () => {
  const api = { buscar: jest.fn().mockResolvedValue([]), categorias };
  render(<Catalogo api={api} />);
  await screen.findByRole("button", { name: "Teatro" });
  pulsar("Teatro");
  await waitFor(() => expect(api.buscar).toHaveBeenLastCalledWith({ texto: "", categoria: "Teatro" }));
});
