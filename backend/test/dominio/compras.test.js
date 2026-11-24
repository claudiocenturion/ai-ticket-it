import assert from "node:assert/strict";
import { test } from "node:test";
import { Compra } from "../../src/dominio/Compra.js";
import { Categoria } from "../../src/dominio/Categoria.js";
import { Evento } from "../../src/dominio/Evento.js";
import { EstadoCompra } from "../../src/dominio/EstadoCompra.js";
import { CambioEstadoCompra } from "../../src/dominio/CambioEstadoCompra.js";
import { Mensaje } from "../../src/dominio/Mensaje.js";
import { Resenia } from "../../src/dominio/Resenia.js";
import { comprador, datosEvento, organizador } from "../fixture.js";

const evento = new Evento({
  ...datosEvento(), organizador, categoria: new Categoria({ nombre: "Música" }),
  fecha: new Date(datosEvento().fecha), tiposEntrada: [{ nombre: "General", precio: 500, cupo: 3 }],
});
const [tipoEntrada] = evento.tiposEntrada;
const datos = { comprador, evento, tipoEntrada };

test("CU12 la compra conserva el precio y comienza pendiente de pago", () => {
  const compra = new Compra({ ...datos, cantidad: 2 });
  assert.equal(compra.total, 1000);
  assert.equal(compra.tipoEntrada.precio, 500);
  assert.equal(compra.estado, EstadoCompra.PENDIENTE);
  assert.equal(compra.id, undefined);
  assert.ok(Object.isFrozen(compra));
});

test("El modelo relaciona compra, usuario, evento, mensajes, reseña y cambio de estado", () => {
  const fecha = new Date("2030-01-01T00:00:00.000Z");
  const mensaje = new Mensaje({ usuario: comprador, mensaje: "Consulta", enviado: fecha });
  const compra = new Compra({ ...datos, cantidad: 1, mensajes: [mensaje] });
  assert.equal(compra.comprador, comprador);
  assert.equal(compra.evento, evento);
  assert.equal(compra.mensajes[0], mensaje);
  assert.equal(mensaje.enviado.toISOString(), fecha.toISOString());
  assert.equal(evento.organizador, organizador);
  assert.equal(evento.categoria.nombre, "Música");
  assert.equal(evento.tuPrecioEstaEntre(400, 500), true);
  assert.equal(tipoEntrada.hayCupoPara(2, 2), false);
  compra.actualizarEstado(EstadoCompra.CONFIRMADA);
  assert.throws(() => compra.actualizarEstado("INVALIDO"), { estado: 400 });
  const cambio = new CambioEstadoCompra({ compra, estado: compra.estado, quien: organizador, fechaHora: fecha });
  assert.equal(cambio.compra, compra);
  assert.equal(cambio.quien, organizador);
  assert.equal(cambio.estado, EstadoCompra.CONFIRMADA);
  const resenia = new Resenia({ comprador, evento, detalle: "Muy bueno", puntuacion: 4 });
  assert.equal(resenia.evento, evento);
  assert.equal(resenia.comprador, comprador);
});

test("CU12 rechaza cantidades inválidas y verifica el cupo luego de ventas previas", () => {
  for (const cantidad of [0, -1, 1.5, NaN, "1", Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => new Compra({ ...datos, cantidad }), { estado: 400 });
  }
  assert.equal(new Compra({ ...datos, cantidad: 1, cantidadComprada: 2 }).cantidad, 1);
  assert.throws(() => new Compra({ ...datos, cantidad: 2, cantidadComprada: 2 }), { estado: 409 });
  assert.throws(() => new Compra({ ...datos, cantidad: 1, cantidadComprada: 3 }), { estado: 409 });
});
