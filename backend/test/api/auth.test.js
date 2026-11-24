import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import bcrypt from "bcrypt";
import { crearApp } from "../../src/app.js";
import { crearUsuariosIniciales } from "../../src/configuracion/cuentasIniciales.js";
import { cargarFuncionesIniciales } from "../../src/configuracion/funcionesIniciales.js";
import { UsuariosEnMemoria } from "../../src/repositorios/UsuariosEnMemoria.js";
import { codigoOrganizador, datosEvento } from "../fixture.js";

const cuenta = { nombre: "Ada", apellido: "López", email: "ada@example.test", clave: "clave-pruebas-123" };

const iniciar = async (contexto, usuarios = new UsuariosEnMemoria(), { precargarEventos, secretoJwt } = {}) => {
  let ahora = Date.parse("2030-01-01T00:00:00.000Z");
  const servidor = crearApp({ usuarios, codigoOrganizador, relojJwt: () => ahora, reloj: () => ahora, precargarEventos, secretoJwt })
    .listen(0, "127.0.0.1");
  await once(servidor, "listening");
  contexto.after(() => new Promise((resolver) => servidor.close(resolver)));
  const base = `http://127.0.0.1:${servidor.address().port}/api`;
  const pedir = (ruta, { token, body, method = body ? "POST" : "GET" } = {}) => fetch(base + ruta, {
    method,
    headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(body && { "Content-Type": "application/json" }) },
    ...(body && { body: JSON.stringify(body) }),
  });
  return { pedir, usuarios, avanzar: (ms) => { ahora += ms; } };
};

test("Las cuentas precargadas ingresan con su clave y conservan sus roles", async (contexto) => {
  const { pedir } = await iniciar(contexto, crearUsuariosIniciales());
  for (const [nombreUsuario, email, nombre, rol, clave] of [
    ["claudio", "claudio@me.com", "Claudio", "COMPRADOR", "porimista"],
    ["cine_banfield", "cine@me.com", "Cine", "ORGANIZADOR", "porimirsta"],
  ]) {
    const sesiones = await Promise.all([nombreUsuario, email].map(async (identificador) => {
      const respuesta = await pedir("/auth/ingreso", { body: { identificador, clave } });
      assert.equal(respuesta.status, 200);
      return respuesta.json();
    }));
    assert.equal(sesiones[0].usuario.id, sesiones[1].usuario.id);
    assert.equal(sesiones[0].usuario.nombre, nombre);
    assert.equal(sesiones[0].usuario.rol, rol);
    assert.equal((await pedir("/auth/yo", { token: sesiones[0].token })).status, 200);
  }
});

test("Las funciones iniciales aparecen en Cine y pertenecen al organizador Cine Banfield", async (contexto) => {
  const { pedir } = await iniciar(contexto, crearUsuariosIniciales(), { precargarEventos: cargarFuncionesIniciales });
  const respuesta = await pedir("/auth/ingreso", { body: { identificador: "cine_banfield", clave: "porimirsta" } });
  assert.equal(respuesta.status, 200);
  const { token, usuario } = await respuesta.json();
  const funciones = await (await pedir("/eventos?categoria=Cine")).json();
  assert.deepEqual(funciones.map(({ nombre }) => nombre), [
    "Avengers: Doomsday", "Interestelar", "El viaje de Chihiro", "Jurassic Park",
  ]);
  assert.ok(funciones.every(({ organizadorId, fecha }) =>
    organizadorId === usuario.id && Date.parse(fecha) > Date.parse("2030-01-01T00:00:00.000Z")));
  assert.equal(funciones[0].tiposEntrada[0].cupoDisponible, 1);
  const propios = await (await pedir("/eventos/propios", { token })).json();
  assert.deepEqual(propios.map(({ id }) => id), funciones.map(({ id }) => id));
});

test("Registro e ingreso guardan hashes bcrypt y emiten JWT de una hora", async (contexto) => {
  const { pedir, usuarios } = await iniciar(contexto);
  const registro = await pedir("/auth/registro", { body: { ...cuenta, id: "impostor" } });
  assert.equal(registro.status, 201);
  const { usuario, token } = await registro.json();
  assert.deepEqual(usuario, { id: usuario.id, nombre: cuenta.nombre, apellido: cuenta.apellido, rol: "COMPRADOR" });
  assert.notEqual(usuario.id, "impostor");
  assert.equal(registro.headers.get("cache-control"), "no-store");
  const hash = usuarios.buscarCuenta(cuenta.email).hash;
  assert.match(hash, /^\$2[by]\$12\$/);
  assert.equal(await bcrypt.compare(cuenta.clave, hash), true);
  const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  assert.equal(claims.sub, usuario.id);
  assert.equal(claims.exp - claims.iat, 3600);
  assert.equal(Object.hasOwn(claims, "jti"), false);
  assert.deepEqual(await (await pedir("/auth/yo", { token })).json(), usuario);

  const otroIngreso = await pedir("/auth/ingreso", { body: { email: " ADA@example.test ", clave: cuenta.clave } });
  assert.equal(otroIngreso.status, 200);
  assert.deepEqual((await otroIngreso.json()).usuario, usuario);
  assert.equal((await pedir("/auth/ingreso", { body: { email: cuenta.email, clave: "incorrecta" } })).status, 401);
  assert.equal((await pedir("/auth/registro", { body: { ...cuenta, email: "ADA@example.test" } })).status, 409);
  assert.equal((await pedir("/auth/registro", { body: { ...cuenta, clave: "é".repeat(37) } })).status, 400);
});

test("El rol de organizador requiere código y el JWT no permite cambiar permisos", async (contexto) => {
  const { pedir } = await iniciar(contexto);
  const cuerpo = { ...cuenta, rol: "ORGANIZADOR" };
  assert.equal((await pedir("/auth/registro", { body: cuerpo })).status, 403);
  assert.equal((await pedir("/auth/registro", { body: { ...cuerpo, codigoOrganizador: "erróneo" } })).status, 403);
  const { token } = await (await pedir("/auth/registro", { body: cuenta })).json();
  assert.equal((await pedir("/eventos", { token, body: datosEvento() })).status, 403);
  const [cabecera, datos, firma] = token.split(".");
  const claims = JSON.parse(Buffer.from(datos, "base64url").toString("utf8"));
  const modificado = Buffer.from(JSON.stringify({ ...claims, rol: "ORGANIZADOR" })).toString("base64url");
  assert.equal((await pedir("/auth/yo", { token: `${cabecera}.${modificado}.${firma}` })).status, 401);
  const respuestaOrganizador = await pedir("/auth/registro", {
    body: { ...cuerpo, email: "organiza@example.test", codigoOrganizador },
  });
  assert.equal(respuestaOrganizador.status, 201);
  const organizador = await respuestaOrganizador.json();
  assert.equal(organizador.usuario.rol, "ORGANIZADOR");
  assert.equal((await pedir("/eventos", { token: organizador.token, body: datosEvento() })).status, 201);
  assert.equal((await pedir("/compras", { token: organizador.token })).status, 403);
});

test("Otra instancia valida el JWT sin compartir sesiones y lo rechaza al vencer", async (contexto) => {
  const usuarios = new UsuariosEnMemoria();
  const secretoJwt = Buffer.alloc(32, 9);
  const { pedir } = await iniciar(contexto, usuarios, { secretoJwt });
  const { token } = await (await pedir("/auth/registro", { body: cuenta })).json();
  const otraInstancia = await iniciar(contexto, usuarios, { secretoJwt });
  assert.equal((await otraInstancia.pedir("/auth/yo", { token })).status, 200);
  otraInstancia.avanzar(3_600_000);
  assert.equal((await otraInstancia.pedir("/auth/yo", { token })).status, 401);
});
