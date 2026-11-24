import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import { crearApp } from "../../src/app.js";
import { Logger } from "../../src/infraestructura/Logger.js";
import { codigoOrganizador, datosEvento, registrarCuenta, reloj } from "../fixture.js";

const ruta = "/api/eventos";

const iniciarApi = async (contexto, conCuentas = true, logger) => {
  const servidor = crearApp({
    reloj, codigoOrganizador, origenesWeb: ["http://localhost:8081"], logger,
  }).listen(0, "127.0.0.1");
  await once(servidor, "listening");
  contexto.after(() => new Promise((resolver) => servidor.close(resolver)));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const url = base + ruta;
  const cuentas = conCuentas ? await Promise.all([
    registrarCuenta(base, "COMPRADOR"), registrarCuenta(base, "ORGANIZADOR"),
  ]) : [];
  const sesiones = { comprador: cuentas[0], organizador: cuentas[1] };
  const enviar = (destino, datos, rol) => fetch(destino, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(rol && { Authorization: `Bearer ${sesiones[rol].token}` }),
    },
    body: JSON.stringify(datos),
  });
  return {
    sesiones,
    solicitar: (destino, opciones) => fetch(url + destino, opciones),
    buscar: (query = "") => fetch(url + query),
    crear: (datos, token) => enviar(url, datos, token),
    comprar: (id, cantidad, token = "comprador") => enviar(
      `${url}/${id}/compras`, { tipoEntrada: "General", cantidad, compradorId: "impostor" }, token,
    ),
  };
};

test("CU04 y CU03 publican un evento y lo recuperan por texto y categoría", async (contexto) => {
  const api = await iniciarApi(contexto);
  const creacion = await api.crear(datosEvento({ organizadorId: "impostor" }), "organizador");
  assert.equal(creacion.status, 201);
  const creado = await creacion.json();
  assert.equal(creado.organizadorId, api.sesiones.organizador.usuario.id);
  assert.deepEqual(creado.tiposEntrada, datosEvento().tiposEntrada.map((tipo) => ({
    ...tipo, cupoDisponible: tipo.cupo,
  })));

  const eventos = await api.buscar("?texto=festival&categoria=musica");
  assert.equal(eventos.status, 200);
  assert.deepEqual(await eventos.json(), [creado]);
  assert.deepEqual(await (await api.buscar("?categoria=Teatro")).json(), []);
});

test("CU04 exige sesión de organizador y valida el body antes de guardar", async (contexto) => {
  const api = await iniciarApi(contexto);
  assert.equal((await api.crear(datosEvento())).status, 401);
  assert.equal((await api.crear(datosEvento(), "comprador")).status, 403);
  const invalido = datosEvento({ tiposEntrada: [{ nombre: "General", precio: "100", cupo: 10 }] });
  assert.equal((await api.crear(invalido, "organizador")).status, 400);
  const categoriaInvalida = await api.crear(datosEvento({ categoria: "Inventada" }), "organizador");
  assert.equal(categoriaInvalida.status, 400);
  assert.deepEqual(await categoriaInvalida.json(), { mensaje: "Elegí una categoría del catálogo" });
  assert.deepEqual(await (await api.buscar()).json(), []);
});

test("CU03 rechaza filtros repetidos", async (contexto) => {
  const api = await iniciarApi(contexto, false);
  const respuesta = await api.buscar("?texto=uno&texto=dos");
  assert.equal(respuesta.status, 400);
  assert.deepEqual(await respuesta.json(), { mensaje: "Usá un único valor por filtro" });
});

test("CU03 el catálogo de categorías se puede consultar antes de crear eventos", async (contexto) => {
  const api = await iniciarApi(contexto, false);
  const respuesta = await api.solicitar("/categorias");
  assert.equal(respuesta.status, 200);
  const categorias = await respuesta.json();
  assert.ok(categorias.some(({ nombre }) => nombre === "Música"));
  assert.ok(categorias.some(({ nombre }) => nombre === "Teatro"));
  assert.deepEqual(await (await api.buscar()).json(), []);
});

test("El middleware de errores devuelve JSON ante un cuerpo malformado y una ruta inexistente", async (contexto) => {
  const api = await iniciarApi(contexto, false);
  const malformado = await api.solicitar("", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(malformado.status, 400);
  assert.deepEqual(await malformado.json(), { mensaje: "JSON inválido" });
  const inexistente = await api.solicitar("/ruta-inexistente");
  assert.equal(inexistente.status, 404);
  assert.deepEqual(await inexistente.json(), { mensaje: "Ruta inexistente" });
});

test("CU12 registra la compra del comprador autenticado y actualiza el catálogo", async (contexto) => {
  const api = await iniciarApi(contexto);
  const evento = await (await api.crear(datosEvento(), "organizador")).json();
  assert.equal((await api.comprar(evento.id, 2, null)).status, 401);
  assert.equal((await api.comprar(evento.id, 2, "organizador")).status, 403);

  const respuesta = await api.comprar(evento.id, 2);
  assert.equal(respuesta.status, 201);
  const { id, ...compra } = await respuesta.json();
  assert.ok(id);
  assert.deepEqual(compra, {
    compradorId: api.sesiones.comprador.usuario.id, eventoId: evento.id, tipoEntrada: "General",
    cantidad: 2, precioUnitario: 10000, total: 20000, estado: "PENDIENTE",
  });
  const [actualizado] = await (await api.buscar()).json();
  assert.deepEqual(actualizado.tiposEntrada.map((tipo) => tipo.cupoDisponible), [98, 10]);
});

test("Expo web puede hacer el preflight de una solicitud autenticada desde el origen autorizado", async (contexto) => {
  const api = await iniciarApi(contexto, false);
  const preflight = (origen) => api.solicitar("", {
    method: "OPTIONS",
    headers: {
      Origin: origen,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,authorization",
    },
  });
  const permitido = await preflight("http://localhost:8081");
  assert.equal(permitido.status, 204);
  assert.equal(permitido.headers.get("access-control-allow-origin"), "http://localhost:8081");
  assert.match(permitido.headers.get("access-control-allow-headers"), /Authorization/i);
  assert.equal((await preflight("http://otro.example")).headers.get("access-control-allow-origin"), null);
});

test("El logger correlaciona solicitudes y omite el body, la consulta y el token", async (contexto) => {
  const lineas = [];
  const capturar = (linea) => lineas.push(linea);
  const api = await iniciarApi(contexto, false, new Logger({
    salida: { info: capturar, warn: capturar, error: capturar }, formato: "json",
  }));
  const aceptada = await api.buscar();
  const rechazada = await api.solicitar("?prueba=consulta-secreta", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer token-secreto" },
    body: JSON.stringify({ clave: "clave-secreta" }),
  });
  assert.equal(rechazada.status, 401);
  assert.equal(lineas.length, 2);
  assert.doesNotMatch(lineas.join("\n"), /consulta-secreta|token-secreto|clave-secreta/);
  const [info, warn] = lineas.map(JSON.parse);
  assert.equal(info.solicitudId, aceptada.headers.get("x-request-id"));
  assert.equal(info.nivel, "info");
  assert.equal(warn.solicitudId, rechazada.headers.get("x-request-id"));
  assert.equal(warn.nivel, "warn");
  assert.equal(warn.ruta, "/api/eventos/");
  assert.equal(warn.estado, 401);
  assert.ok(warn.duracionMs >= 0);
});

test("CU12 rechaza cantidades inválidas o superiores al cupo y arbitra dos pedidos por la última entrada", async (contexto) => {
  const api = await iniciarApi(contexto);
  const evento = await (await api.crear(datosEvento({
    tiposEntrada: [{ nombre: "General", precio: 100, cupo: 1 }],
  }), "organizador")).json();
  for (const cantidad of [0, -1, 1.5, "1", null]) {
    assert.equal((await api.comprar(evento.id, cantidad)).status, 400);
  }
  assert.equal((await api.comprar(evento.id, 2)).status, 409);
  const respuestas = await Promise.all([api.comprar(evento.id, 1), api.comprar(evento.id, 1)]);
  assert.deepEqual(respuestas.map(({ status }) => status).sort(), [201, 409]);
  const rechazo = respuestas.find(({ status }) => status === 409);
  assert.deepEqual(await rechazo.json(), { mensaje: "Cupo insuficiente" });
  const [actualizado] = await (await api.buscar()).json();
  assert.equal(actualizado.tiposEntrada[0].cupoDisponible, 0);
});
