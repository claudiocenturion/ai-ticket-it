import assert from "node:assert/strict";
import { test } from "node:test";
import { esquemaCompra } from "../../src/validaciones/compras.js";
import { esquemaEvento, esquemaFiltrosEvento } from "../../src/validaciones/eventos.js";
import { validarEsquema } from "../../src/validaciones/validarEsquema.js";
import { datosEvento } from "../fixture.js";

test("CU03 el DTO aplica filtros vacíos por defecto y rechaza valores repetidos", () => {
  assert.deepEqual(validarEsquema(esquemaFiltrosEvento, {}), { texto: "", categoria: "" });
  assert.throws(() => validarEsquema(esquemaFiltrosEvento, { texto: ["uno", "dos"] }), { estado: 400 });
});

test("CU04 el DTO rechaza campos inválidos y proyecta solo los datos de entrada", () => {
  for (const cambios of [
    { nombre: " " }, { fecha: "2030-02-01" }, { imagenUrl: "ftp://example.test" },
    { tiposEntrada: [] }, { tiposEntrada: [{ nombre: "General", precio: 0, cupo: 1.5 }] },
  ]) {
    assert.throws(() => validarEsquema(esquemaEvento, datosEvento(cambios)), { estado: 400 });
  }
  const entrada = validarEsquema(esquemaEvento, datosEvento({ organizadorId: "impostor" }));
  assert.equal(entrada.organizadorId, undefined);
  assert.deepEqual(entrada.tiposEntrada, datosEvento().tiposEntrada);
});

test("CU12 el DTO exige evento, tipo y cantidad válida y descarta campos externos", () => {
  const validarCompra = (params, body) => validarEsquema(esquemaCompra, { params, body });
  assert.throws(() => validarCompra({ eventoId: " " }, { tipoEntrada: "General", cantidad: 1 }), { estado: 400 });
  const params = { eventoId: "evento" };
  for (const cuerpo of [null, { tipoEntrada: " ", cantidad: 1 }, { tipoEntrada: "General", cantidad: "1" }]) {
    assert.throws(() => validarCompra(params, cuerpo), { estado: 400 });
  }
  const entrada = validarCompra(params, { tipoEntrada: " General ", cantidad: 1, total: 0, eventoId: "otro" });
  assert.deepEqual(entrada, { params, body: { tipoEntrada: "General", cantidad: 1 } });
});
