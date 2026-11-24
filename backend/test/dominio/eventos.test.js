import assert from "node:assert/strict";
import { test } from "node:test";
import { Categoria } from "../../src/dominio/Categoria.js";
import { Evento } from "../../src/dominio/Evento.js";
import { TipoEntrada } from "../../src/dominio/TipoEntrada.js";
import { datosEvento, organizador } from "../fixture.js";

test("CU04 acepta un tipo con precio cero y cupo positivo", () => {
  const entrada = new TipoEntrada({ nombre: "General", precio: 0, cupo: 5 });
  assert.equal(entrada.precio, 0);
  assert.equal(entrada.cupo, 5);
  assert.throws(() => { entrada.cupo = -1; }, TypeError);
});

test("CU04 rechaza precios negativos y cupos inválidos en el dominio", () => {
  assert.throws(() => new TipoEntrada({ nombre: "VIP", precio: -1, cupo: 1 }), /precio/);
  for (const cupo of [0, -1, 1.5]) {
    assert.throws(() => new TipoEntrada({ nombre: "VIP", precio: 100, cupo }), /cupo/);
  }
});

test("CU04 rechaza un evento sin entradas, con entradas repetidas o con fecha inválida", () => {
  const crear = (cambios) => {
    const datos = datosEvento(cambios);
    return new Evento({
      ...datos, organizador, categoria: new Categoria({ nombre: datos.categoria }),
      fecha: new Date(datos.fecha),
    });
  };
  assert.throws(() => crear({ tiposEntrada: [] }), /al menos/);
  assert.throws(() => crear({ tiposEntrada: [
    { nombre: "VIP", precio: 7, cupo: 1 }, { nombre: "vip", precio: 8, cupo: 2 },
  ] }), /únicos/);
  assert.throws(() => crear({ fecha: "inválida" }), /fecha/);
});
