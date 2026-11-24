import assert from "node:assert/strict";
import { test } from "node:test";
import { ComprasEnMemoria } from "../../src/repositorios/ComprasEnMemoria.js";
import { EventosEnMemoria } from "../../src/repositorios/EventosEnMemoria.js";
import { ComprasService } from "../../src/services/ComprasService.js";
import { ErrorValidacion } from "../../src/dominio/Errores.js";
import { EventosService } from "../../src/services/EventosService.js";
import { comprador, datosEvento, organizador, reloj, usuarioPrueba } from "../fixture.js";

const preparar = () => {
  const eventos = new EventosEnMemoria();
  const compras = new ComprasEnMemoria();
  const service = new ComprasService(eventos, compras, reloj);
  const evento = new EventosService(eventos, reloj).crear(datosEvento({
    tiposEntrada: [{ nombre: "General", precio: 500, cupo: 1 }],
  }), organizador);
  return { service, compras, params: { eventoId: evento.id }, body: { tipoEntrada: "General", cantidad: 1 } };
};

test("CU12 el service valida permisos, tipo y cantidad antes de registrar", () => {
  const { service, compras, params, body } = preparar();
  const { eventoId } = params;
  const { tipoEntrada } = body;
  assert.throws(() => service.comprar(params.eventoId, body, organizador), { estado: 403 });
  assert.throws(() => service.comprar(params.eventoId, { ...body, tipoEntrada: "VIP" }, comprador), { estado: 404 });
  assert.throws(() => service.comprar(params.eventoId, { ...body, cantidad: 0 }, comprador), ErrorValidacion);
  assert.throws(() => service.comprar(undefined, body, comprador), ErrorValidacion);
  assert.throws(() => service.comprar(params.eventoId, undefined, comprador), ErrorValidacion);
  assert.throws(() => service.comprar("inexistente", { ...body, cantidad: "1" }, organizador), ErrorValidacion);
  assert.throws(() => service.comprar(params.eventoId, { ...body, cantidad: 2 }, comprador), { estado: 409 });
  assert.equal(compras.cantidadComprada(eventoId, tipoEntrada), 0);
  const compra = service.comprar(params.eventoId, { ...body, eventoId: "otro", id: "externo" }, comprador);
  assert.equal(compra.comprador, comprador);
  assert.equal(compra.evento.id, eventoId);
  assert.match(compra.id, /^[\da-f-]{36}$/i);
  assert.equal(compras.cantidadComprada(eventoId, tipoEntrada), 1);
});

test("CU12 dos compradores que compiten por el último lugar producen una sola compra", async () => {
  const { service, compras, params, body } = preparar();
  const solicitudes = [comprador, usuarioPrueba("comprador-2", "COMPRADOR")].map(
    (usuario) => Promise.resolve().then(() => service.comprar(params.eventoId, body, usuario)),
  );
  const resultados = await Promise.allSettled(solicitudes);
  assert.equal(resultados.filter(({ status }) => status === "fulfilled").length, 1);
  assert.equal(resultados.find(({ status }) => status === "rejected").reason.estado, 409);
  assert.equal(compras.cantidadComprada(params.eventoId, body.tipoEntrada), 1);
});
