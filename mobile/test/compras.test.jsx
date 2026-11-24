import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { View } from "react-native";
import { Catalogo } from "../src/pantallas/Catalogo";

const evento = (cupoDisponible) => ({
  id: "evento-1", nombre: "Festival", categoria: "Música", fecha: "2030-02-01T23:00:00.000Z",
  tiposEntrada: [{ nombre: "General", precio: 500, cupo: 1, cupoDisponible }],
});
const presionar = (vista, name) => fireEvent.press(vista.getByRole("button", { name }));

test("CU12 el catálogo permite elegir tipo y cantidad, y actualiza el cupo luego de comprar", async () => {
  const api = {
    buscar: jest.fn().mockResolvedValueOnce([evento(1)]).mockResolvedValue([evento(0)]),
    comprar: jest.fn().mockResolvedValue({ cantidad: 1 }),
  };
  render(<Catalogo api={api} />);
  await screen.findByText("Festival");
  presionar(screen, "Elegir General");
  await act(async () => { presionar(screen, "Comprar entradas"); });

  expect(screen.getByText("Compra registrada por 1 entrada(s). Pendiente de pago.")).toBeOnTheScreen();
  expect(api.comprar).toHaveBeenCalledWith("evento-1", { tipoEntrada: "General", cantidad: 1 });
  expect(screen.getByRole("button", { name: "Elegir General" })).toBeDisabled();
}, 15000);

test("CU12 el catálogo rechaza cantidad inválida y cupo insuficiente antes de enviar", async () => {
  const api = { buscar: jest.fn().mockResolvedValue([evento(1)]), comprar: jest.fn() };
  render(<Catalogo api={api} />);
  await screen.findByText("Festival");
  presionar(screen, "Elegir General");
  fireEvent.changeText(screen.getByLabelText("Cantidad"), "0");
  presionar(screen, "Comprar entradas");
  expect(screen.getByText("La cantidad debe ser un entero positivo")).toBeOnTheScreen();
  fireEvent.changeText(screen.getByLabelText("Cantidad"), "2");
  presionar(screen, "Comprar entradas");
  expect(screen.getByText("Cupo insuficiente")).toBeOnTheScreen();
  expect(api.comprar).not.toHaveBeenCalled();
});

test("CU12 dos pantallas con el último lugar visible muestran la compra y el conflicto del servidor", async () => {
  let cupo = 1;
  const api = {
    buscar: jest.fn(async () => [evento(cupo)]),
    comprar: jest.fn(async () => {
      await Promise.resolve();
      if (cupo === 0) throw Object.assign(new Error("Cupo insuficiente"), { estado: 409 });
      cupo -= 1;
      return { cantidad: 1 };
    }),
  };
  render(
    <>
      <View testID="primer-catalogo"><Catalogo api={api} /></View>
      <View testID="segundo-catalogo"><Catalogo api={api} /></View>
    </>,
  );
  const primero = within(screen.getByTestId("primer-catalogo"));
  const segundo = within(screen.getByTestId("segundo-catalogo"));
  await primero.findByText("Festival");
  await segundo.findByText("Festival");
  presionar(primero, "Elegir General");
  presionar(segundo, "Elegir General");
  await act(async () => {
    presionar(primero, "Comprar entradas");
    presionar(segundo, "Comprar entradas");
  });

  expect(primero.getByText("Compra registrada por 1 entrada(s). Pendiente de pago.")).toBeOnTheScreen();
  expect(segundo.getByText("Cupo insuficiente")).toBeOnTheScreen();
  expect(segundo.getByRole("button", { name: "Comprar entradas" })).toBeDisabled();
  expect(api.comprar).toHaveBeenCalledTimes(2);
});
