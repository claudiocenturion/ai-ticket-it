import assert from "node:assert/strict";
import { test } from "node:test";
import { EventosService } from "../../src/services/EventosService.js";
import { ErrorValidacion } from "../../src/dominio/Errores.js";
import { EventosEnMemoria } from "../../src/repositorios/EventosEnMemoria.js";
import { datosEvento, organizador, reloj } from "../fixture.js";

test("CU04 registra un evento con los tipos de entrada y el organizador de la sesión", () => {
  const repo = new EventosEnMemoria();
  const service = new EventosService(repo, reloj);
  const evento = service.crear(datosEvento({ id: "externo", organizadorId: "otro" }), organizador);
  assert.match(evento.id, /^[\da-f-]{36}$/i);
  assert.equal(evento.organizador, organizador);
  assert.equal(evento.tiposEntrada.length, 2);
  assert.deepEqual(repo.listar(), [evento]);
});

test("CU04 rechaza la creación por un comprador y la fecha pasada sin guardar", () => {
  const repo = new EventosEnMemoria();
  const service = new EventosService(repo, reloj);
  assert.throws(() => service.crear(datosEvento(), { rol: "COMPRADOR" }), { estado: 403 });
  assert.throws(() => service.crear(datosEvento({ nombre: " " }), organizador), ErrorValidacion);
  assert.throws(() => service.crear(datosEvento({ nombre: " " }), { rol: "COMPRADOR" }), ErrorValidacion);
  assert.throws(() => service.crear(datosEvento({ fecha: "2029-01-01T00:00:00.000Z" }), organizador), { estado: 409 });
  assert.deepEqual(repo.listar(), []);
});

test("CU03 combina texto y categoría y normaliza tildes y mayúsculas", () => {
  const service = new EventosService(new EventosEnMemoria(), reloj);
  const festival = service.crear(datosEvento(), organizador);
  service.crear(datosEvento({ nombre: "Jazz teatral", categoria: "Teatro" }), organizador);
  assert.deepEqual(service.buscar({ texto: "JAZZ", categoria: "musica" }), [festival]);
  assert.deepEqual(service.buscar({ texto: "desconocido" }), []);
  assert.throws(() => service.buscar({ texto: ["jazz", "rock"] }), ErrorValidacion);
});
