import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import { crearApp } from "../../src/app.js";
import { ComprasEnMemoria } from "../../src/repositorios/ComprasEnMemoria.js";
import { EventosEnMemoria } from "../../src/repositorios/EventosEnMemoria.js";
import { ReseniasEnMemoria } from "../../src/repositorios/ReseniasEnMemoria.js";
import { ComprasService } from "../../src/services/ComprasService.js";
import { EventosService } from "../../src/services/EventosService.js";
import { UsuariosEnMemoria } from "../../src/repositorios/UsuariosEnMemoria.js";
import { codigoOrganizador, datosEvento, registrarCuenta, usuarioPrueba } from "../fixture.js";

const otroComprador = usuarioPrueba("comprador-2", "COMPRADOR");
const otroOrganizador = usuarioPrueba("organizador-2", "ORGANIZADOR");
const inicio = "2030-01-03T00:00:00.000Z";
const fin = "2030-01-03T03:00:00.000Z";

const iniciar = async (contexto) => {
  let ahora = Date.parse("2030-01-01T00:00:00.000Z");
  const reloj = () => ahora;
  const repositorio = new EventosEnMemoria();
  const repositorioCompras = new ComprasEnMemoria();
  const repositorioResenias = new ReseniasEnMemoria();
  const eventos = new EventosService(repositorio, reloj, repositorioCompras, repositorioResenias);
  const compras = new ComprasService(repositorio, repositorioCompras, reloj);
  const usuarios = new UsuariosEnMemoria();
  const servidor = crearApp({
    reloj, repositorio, repositorioCompras, repositorioResenias, usuarios, codigoOrganizador,
  }).listen(0, "127.0.0.1");
  await once(servidor, "listening");
  contexto.after(() => new Promise((resolver) => servidor.close(resolver)));
  const url = `http://127.0.0.1:${servidor.address().port}`;
  const [sesionComprador, sesionOrganizador] = await Promise.all([
    registrarCuenta(url, "COMPRADOR"), registrarCuenta(url, "ORGANIZADOR"),
  ]);
  const tokens = { comprador: sesionComprador.token, organizador: sesionOrganizador.token };
  const comprador = usuarios.obtener(sesionComprador.usuario.id);
  const organizador = usuarios.obtener(sesionOrganizador.usuario.id);

  const pedir = async (ruta, { rol = "comprador", method = "GET", body, esperado = 200 } = {}) => {
    const respuesta = await fetch(`${url}/api${ruta}`, {
      method,
      headers: {
        ...(rol && { Authorization: `Bearer ${tokens[rol]}` }),
        ...(body !== undefined && { "Content-Type": "application/json" }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    const datos = await respuesta.json();
    assert.equal(respuesta.status, esperado, JSON.stringify(datos));
    return datos;
  };
  const crear = (cambios = {}, usuario = organizador) => eventos.crear(datosEvento({
    fecha: inicio, fechaFin: fin, ...cambios,
  }), usuario);
  const comprar = (evento, usuario = comprador, cantidad = 1) =>
    compras.comprar(evento.id, { tipoEntrada: "General", cantidad }, usuario);
  const cambiar = (compra, estado, esperado = 200) => pedir(`/compras/${compra.id}/estado`, {
    rol: "organizador", method: "PATCH", body: { estado }, esperado,
  });
  const cancelar = (compra, esperado = 200) =>
    pedir(`/compras/${compra.id}/cancelacion`, { method: "POST", esperado });
  return {
    pedir, crear, comprar, cambiar, cancelar, repositorioCompras,
    moverReloj: (fecha) => { ahora = Date.parse(fecha); },
  };
};

test("CU01 el comprador ve solo sus compras y días restantes de las confirmadas", async (contexto) => {
  const { pedir, crear, comprar, cambiar } = await iniciar(contexto);
  const evento = crear();
  const confirmada = comprar(evento);
  const pendiente = comprar(evento);
  comprar(evento, otroComprador);
  await cambiar(confirmada, "CONFIRMADA");

  const historial = await pedir("/compras");
  assert.deepEqual(historial.map(({ id, estado, diasRestantes }) => ({ id, estado, diasRestantes })), [
    { id: confirmada.id, estado: "CONFIRMADA", diasRestantes: 2 },
    { id: pendiente.id, estado: "PENDIENTE", diasRestantes: null },
  ]);
  await pedir("/compras", { rol: "organizador", esperado: 403 });
});

test("CU02 el organizador ve ventas, estados y cupos de eventos propios", async (contexto) => {
  const { pedir, crear, comprar, cambiar } = await iniciar(contexto);
  const evento = crear();
  const ajeno = crear({ nombre: "Ajeno" }, otroOrganizador);
  const compra = comprar(evento, undefined, 3);
  await cambiar(compra, "CONFIRMADA");
  assert.deepEqual(await pedir("/eventos/propios", { rol: "organizador" }), [{ id: evento.id, nombre: evento.nombre }]);
  const ventas = await pedir(`/eventos/${evento.id}/ventas`, { rol: "organizador" });
  assert.deepEqual(ventas.tiposEntrada.map(({ cupoDisponible }) => cupoDisponible), [97, 10]);
  assert.deepEqual(ventas.ventas.map(({ id, estado }) => ({ id, estado })), [{ id: compra.id, estado: "CONFIRMADA" }]);
  await pedir(`/eventos/${ajeno.id}/ventas`, { rol: "organizador", esperado: 403 });
});

test("CU05 y CU06 ambos participantes escriben después de cancelar y los terceros quedan excluidos", async (contexto) => {
  const { pedir, crear, comprar, cancelar } = await iniciar(contexto);
  const evento = crear();
  const compra = comprar(evento);
  const otro = comprar(evento, otroComprador);
  const ajena = comprar(crear({}, otroOrganizador));
  const ruta = `/compras/${compra.id}/mensajes`;
  const enviar = (destino, rol, mensaje, esperado = 201) =>
    pedir(destino, { method: "POST", rol, body: { mensaje }, esperado });
  await cancelar(compra);
  await enviar(ruta, "comprador", "¿Cuándo es el reintegro?");
  await enviar(ruta, "organizador", "Ya está registrado.");
  assert.deepEqual((await pedir(ruta)).map(({ mensaje }) => mensaje), ["¿Cuándo es el reintegro?", "Ya está registrado."]);
  await pedir(`/compras/${otro.id}/mensajes`, { esperado: 403 });
  await enviar(`/compras/${otro.id}/mensajes`, "comprador", "Ajeno", 403);
  await enviar(`/compras/${ajena.id}/mensajes`, "organizador", "Ajeno", 403);
});

test("CU05 y CU06 el aviso llega solo al destinatario y la lectura conserva los mensajes más nuevos", async (contexto) => {
  const { pedir, crear, comprar } = await iniciar(contexto);
  const evento = crear();
  const compra = comprar(evento);
  const ajena = comprar(evento, otroComprador);
  const ruta = `/compras/${compra.id}/mensajes`;
  const avisos = "/compras/mensajes/pendientes";
  const enviar = (destino, rol, mensaje) => pedir(destino, { method: "POST", rol, body: { mensaje }, esperado: 201 });
  const leer = (hasta, rol = "comprador") => pedir(`${ruta}/lectura`, { method: "POST", rol, body: { hasta } });

  await pedir(avisos, { rol: null, esperado: 401 });
  await enviar(ruta, "organizador", "Primero");
  await enviar(`/compras/${ajena.id}/mensajes`, "organizador", "Mensaje para otro comprador");
  assert.deepEqual(await pedir(avisos, { rol: "organizador" }), []);
  const [aviso] = await pedir(avisos);
  assert.equal(aviso.compraId, compra.id);
  assert.equal(aviso.eventoId, evento.id);
  assert.equal(aviso.cantidad, 1);
  assert.equal(aviso.ultimo.mensaje, "Primero");
  const vista = await pedir(ruta);

  await enviar(ruta, "organizador", "Segundo");
  await leer(vista.length);
  const pendientes = await pedir(avisos);
  assert.equal(pendientes.length, 1);
  assert.equal(pendientes[0].cantidad, 1);
  assert.equal(pendientes[0].ultimo.mensaje, "Segundo");
  await leer(2);
  await leer(1);
  assert.deepEqual(await pedir(avisos), []);

  await enviar(ruta, "comprador", "Respuesta");
  const [avisoOrganizador] = await pedir(avisos, { rol: "organizador" });
  assert.equal(avisoOrganizador.ultimo.mensaje, "Respuesta");
  assert.deepEqual(await pedir(avisos), []);
  await pedir(`/compras/${ajena.id}/mensajes/lectura`, { method: "POST", body: { hasta: 1 }, esperado: 403 });
  await pedir(`${ruta}/lectura`, { method: "POST", body: { hasta: 99 }, esperado: 400 });
});

test("CU07 una compra pagada se reembolsa, una pendiente se cancela y cada cupo vuelve una sola vez", async (contexto) => {
  const { crear, comprar, cambiar, cancelar, repositorioCompras } = await iniciar(contexto);
  const evento = crear();
  const pagada = comprar(evento);
  const pendiente = comprar(evento);
  await cambiar(pagada, "CONFIRMADA");
  assert.equal((await cancelar(pagada)).estado, "REEMBOLSADA");
  assert.equal((await cancelar(pendiente)).estado, "CANCELADA");
  await cancelar(pagada, 409);
  await cancelar(pendiente, 409);
  assert.equal(repositorioCompras.cantidadComprada(evento.id, "General"), 0);
  assert.deepEqual(repositorioCompras.listarCambios(pagada.id).map(({ estado }) => estado), ["CONFIRMADA", "REEMBOLSADA"]);
  assert.equal(comprar(evento, undefined, 100).cantidad, 100);
});

test("CU08 el comprador no puede cancelar compras utilizadas, de eventos realizados o de otro comprador", async (contexto) => {
  const { crear, comprar, cambiar, cancelar, moverReloj } = await iniciar(contexto);
  const evento = crear();
  const utilizada = comprar(evento);
  const pendiente = comprar(evento);
  const ajena = comprar(evento, otroComprador);
  await cancelar(ajena, 403);
  await cambiar(utilizada, "CONFIRMADA");
  await cambiar(utilizada, "UTILIZADA", 409);
  moverReloj(inicio);
  await cambiar(utilizada, "UTILIZADA");
  await cancelar(utilizada, 409);
  moverReloj(fin);
  await cancelar(pendiente, 409);
});

test("CU09 publicar reseña requiere compra propia, utilizada, evento terminado y puntaje válido", async (contexto) => {
  const { pedir, crear, comprar, cambiar, moverReloj } = await iniciar(contexto);
  const evento = crear();
  const utilizada = comprar(evento);
  const pendiente = comprar(evento);
  const ajena = comprar(evento, otroComprador);
  const reseniar = (compra, esperado, puntuacion = 4) => pedir(`/compras/${compra.id}/resenia`, {
    method: "POST", body: { detalle: "Excelente", puntuacion }, esperado,
  });
  await cambiar(utilizada, "CONFIRMADA");
  await reseniar(ajena, 403);
  moverReloj(inicio);
  await cambiar(utilizada, "UTILIZADA");
  await reseniar(utilizada, 409);
  moverReloj(fin);
  await reseniar(pendiente, 409);
  await reseniar(utilizada, 400, 6);
  assert.equal((await reseniar(utilizada, 201)).puntuacion, 4);
  await reseniar(utilizada, 409);
  assert.equal((await pedir("/compras")).find(({ id }) => id === utilizada.id).puedeReseniar, false);
});

test("CU10 y CU11 el catálogo muestra reseñas anteriores del organizador y respeta los tres órdenes", async (contexto) => {
  const { pedir, crear, comprar, cambiar, moverReloj } = await iniciar(contexto);
  const anterior = crear({ nombre: "Festival anterior" });
  const posterior = crear({ nombre: "Futuro destacado", fecha: "2030-01-10T00:00:00.000Z", fechaFin: undefined });
  const temprano = crear({ nombre: "Futuro temprano", fecha: "2030-01-08T00:00:00.000Z", fechaFin: undefined,
    tiposEntrada: [{ nombre: "General", precio: 20000, cupo: 1 }] }, otroOrganizador);
  const economico = crear({ nombre: "Futuro económico", fecha: "2030-01-09T00:00:00.000Z", fechaFin: undefined,
    tiposEntrada: [{ nombre: "General", precio: 500, cupo: 1 }] }, otroOrganizador);
  const compra = comprar(anterior);
  await cambiar(compra, "CONFIRMADA");
  moverReloj(inicio);
  await cambiar(compra, "UTILIZADA");
  moverReloj(fin);
  await pedir(`/compras/${compra.id}/resenia`, { method: "POST", body: { detalle: "Muy bueno", puntuacion: 4 }, esperado: 201 });

  const resenias = await pedir(`/eventos/${posterior.id}/resenias`, { rol: null });
  assert.deepEqual(resenias.map(({ eventoNombre, puntuacion }) => ({ eventoNombre, puntuacion })),
    [{ eventoNombre: anterior.nombre, puntuacion: 4 }]);
  assert.deepEqual(await pedir(`/eventos/${temprano.id}/resenias`), []);
  assert.deepEqual(await pedir(`/eventos/${anterior.id}/resenias`), []);
  for (const [orden, ...esperados] of [
    ["fecha", temprano, economico, posterior],
    ["precio", economico, posterior, temprano],
    ["puntaje", posterior, temprano, economico],
  ]) {
    const catalogo = await pedir(`/eventos?texto=futuro&orden=${orden}`, { rol: null });
    assert.deepEqual(catalogo.map(({ id }) => id), esperados.map(({ id }) => id));
  }
  await pedir("/eventos?orden=otro", { esperado: 400 });
});
