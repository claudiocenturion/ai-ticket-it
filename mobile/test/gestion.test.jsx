import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Catalogo } from "../src/pantallas/Catalogo";
import { MisCompras } from "../src/pantallas/MisCompras";
import { Ventas } from "../src/pantallas/Ventas";

jest.setTimeout(15000);

const compra = {
  id: "compra-1", eventoNombre: "Festival", compradorNombre: "Comprador Demo",
  tipoEntrada: "General", cantidad: 1, estado: "CONFIRMADA", diasRestantes: 2,
  puedeCancelar: true,
};
const pulsar = (name) => fireEvent.press(screen.getByRole("button", { name }));
const completar = (etiqueta, texto) => fireEvent.changeText(screen.getByLabelText(etiqueta), texto);

test("CU01, CU07 y CU08 muestran días y estado, permiten cancelar y ocultan la acción cuando ya no corresponde", async () => {
  const api = {
    misCompras: jest.fn().mockResolvedValueOnce([compra])
      .mockResolvedValue([{ ...compra, estado: "REEMBOLSADA", diasRestantes: null, puedeCancelar: false }]),
    cancelar: jest.fn().mockResolvedValue({ estado: "REEMBOLSADA" }),
  };
  render(<MisCompras api={api} />);
  await screen.findByText("2 días para el evento", {}, { timeout: 5000 });
  pulsar("Cancelar compra");
  await act(async () => { pulsar("Confirmar cancelación"); });
  expect(api.cancelar).toHaveBeenCalledWith(compra.id);
  expect(screen.getByText(/Reembolsada/)).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Cancelar compra" })).toBeNull();
});

test("CU05 el comprador escribe desde el chat de una compra cancelada", async () => {
  const api = {
    misCompras: jest.fn().mockResolvedValue([{ ...compra, estado: "CANCELADA", puedeCancelar: false }]),
    mensajes: jest.fn().mockResolvedValueOnce([]).mockResolvedValue([
      { usuario: "Comprador Demo", mensaje: "Consulta", enviado: "2030-01-01" },
    ]),
    enviarMensaje: jest.fn().mockResolvedValue({}),
  };
  render(<MisCompras api={api} />);
  await screen.findByText("Festival");
  pulsar("Abrir chat");
  await screen.findByText("Todavía no hay mensajes");
  completar("Mensaje", "Consulta");
  await act(async () => { pulsar("Enviar mensaje"); });
  expect(api.enviarMensaje).toHaveBeenCalledWith(compra.id, "Consulta");
  expect(screen.getByText("Comprador Demo: Consulta")).toBeOnTheScreen();
});

test("CU05 y CU06 una conversación abierta trae los mensajes nuevos sin pulsar actualizar", async () => {
  jest.useFakeTimers();
  try {
    const mensaje = { usuario: "Organizador Demo", mensaje: "Hola", enviado: "2030-01-01T12:00:00.000Z" };
    const api = {
      misCompras: jest.fn().mockResolvedValue([compra]),
      mensajes: jest.fn().mockResolvedValueOnce([]).mockResolvedValue([mensaje]),
      marcarMensajesLeidos: jest.fn().mockResolvedValue({ leidos: true }),
    };
    render(<MisCompras api={api} />);
    await screen.findByText("Festival");
    await act(async () => { pulsar("Abrir chat"); });
    expect(screen.getByText("Todavía no hay mensajes")).toBeOnTheScreen();
    await act(async () => { jest.advanceTimersByTime(3000); });
    expect(screen.getByText("Organizador Demo: Hola")).toBeOnTheScreen();
    expect(api.marcarMensajesLeidos).toHaveBeenCalledWith(compra.id, 1);
    expect(screen.queryByRole("button", { name: "Actualizar mensajes" })).toBeNull();
  } finally {
    jest.useRealTimers();
  }
});

test("CU02 y CU06 el organizador ve cupo y estado de la venta y puede responder", async () => {
  const api = {
    misEventos: jest.fn().mockResolvedValue([{ id: "evento-1", nombre: "Festival" }]),
    ventas: jest.fn().mockResolvedValue({ tiposEntrada: [{ nombre: "General", cupoDisponible: 2, cupo: 3 }],
      ventas: [{ ...compra, estado: "PENDIENTE", diasRestantes: null, puedeConfirmar: true }] }),
    mensajes: jest.fn().mockResolvedValue([]),
    enviarMensaje: jest.fn().mockResolvedValue({}),
    cambiarEstado: jest.fn().mockResolvedValue({}),
  };
  render(<Ventas api={api} />);
  await screen.findByRole("button", { name: "Ver ventas de Festival" });
  pulsar("Ver ventas de Festival");
  await screen.findByText("General: 2 de 3 disponibles");
  expect(screen.getByText(/Pendiente de pago/)).toBeOnTheScreen();
  await act(async () => { pulsar("Confirmar pago simulado"); });
  expect(api.cambiarEstado).toHaveBeenCalledWith(compra.id, "CONFIRMADA");
  pulsar("Abrir chat");
  await screen.findByText("Todavía no hay mensajes");
  completar("Mensaje", "Respuesta");
  await act(async () => { pulsar("Enviar mensaje"); });
  expect(api.enviarMensaje).toHaveBeenCalledWith(compra.id, "Respuesta");
});

test("CU09 muestra la reseña solo para compras elegibles y publica puntaje y comentario", async () => {
  const utilizada = { ...compra, estado: "UTILIZADA", puedeCancelar: false, diasRestantes: null };
  const api = {
    misCompras: jest.fn().mockResolvedValueOnce([{ ...utilizada, puedeReseniar: true }])
      .mockResolvedValue([utilizada]),
    reseniar: jest.fn().mockResolvedValue({}),
  };
  render(<MisCompras api={api} />);
  await screen.findByText("Festival");
  completar("Puntaje de 1 a 5", "4,5");
  completar("Comentario", "Buen evento");
  await act(async () => { pulsar("Publicar reseña"); });
  expect(api.reseniar).toHaveBeenCalledWith(compra.id, { detalle: "Buen evento", puntuacion: 4.5 });
  expect(screen.getByText("Reseña publicada")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Publicar reseña" })).toBeNull();
});

test("CU10 y CU11 el catálogo permite ordenar y consultar reseñas previas del evento elegido", async () => {
  const evento = { id: "evento-1", nombre: "Festival", categoria: "Música",
    fecha: "2030-02-01T23:00:00.000Z", tiposEntrada: [] };
  const api = {
    buscar: jest.fn().mockResolvedValue([evento]),
    resenias: jest.fn().mockResolvedValue([{ id: "r1", eventoNombre: "Festival anterior",
      compradorNombre: "Comprador Demo", detalle: "Excelente", puntuacion: 5 }]),
  };
  render(<Catalogo api={api} />);
  await screen.findByText("Festival");
  await act(async () => { pulsar("Precio"); });
  expect(api.buscar).toHaveBeenLastCalledWith({ texto: "", categoria: "", orden: "precio" });
  await act(async () => { pulsar("Puntaje del organizador"); });
  expect(api.buscar).toHaveBeenLastCalledWith({ texto: "", categoria: "", orden: "puntaje" });
  await act(async () => { pulsar("Fecha"); });
  expect(api.buscar).toHaveBeenLastCalledWith({ texto: "", categoria: "", orden: "fecha" });
  await act(async () => { pulsar("Ver reseñas previas"); });
  expect(api.resenias).toHaveBeenCalledWith(evento.id);
  expect(screen.getByText("Festival anterior · 5/5")).toBeOnTheScreen();
});
