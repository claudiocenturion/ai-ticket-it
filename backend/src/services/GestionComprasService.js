import { CambioEstadoCompra } from "../dominio/CambioEstadoCompra.js";
import { EstadoCompra } from "../dominio/EstadoCompra.js";
import { ErrorConflicto, ErrorNoEncontrado, ErrorPermiso } from "../dominio/Errores.js";
import { Mensaje } from "../dominio/Mensaje.js";
import { esquemaCambioVenta, esquemaId, esquemaLecturaMensajes, esquemaMensaje } from "../validaciones/compras.js";
import { validarEsquema } from "../validaciones/validarEsquema.js";

const { PENDIENTE, CONFIRMADA, UTILIZADA, CANCELADA, REEMBOLSADA } = EstadoCompra;
const milisegundosPorDia = 86_400_000;

export class GestionComprasService {
  constructor(eventos, compras, resenias, reloj) {
    Object.assign(this, { eventos, compras, resenias, reloj });
  }

  listarPropias(usuario) {
    this.#exigirRol(usuario, "COMPRADOR");
    const ahora = this.reloj();
    return this.compras.listarPorComprador(usuario.id).map((compra) => ({
      compra,
      diasRestantes: compra.estado === CONFIRMADA
        ? Math.max(0, Math.ceil((compra.evento.fecha - ahora) / milisegundosPorDia)) : null,
      puedeCancelar: this.#puedeCancelar(compra, ahora),
      puedeReseniar: compra.estado === UTILIZADA && compra.evento.fechaFin <= ahora
        && !this.resenias.existe(usuario.id, compra.evento.id),
    }));
  }

  listarEventosPropios(usuario) {
    this.#exigirRol(usuario, "ORGANIZADOR");
    return this.eventos.listar().filter(({ organizador }) => organizador.id === usuario.id);
  }

  listarVentas(eventoId, usuario) {
    const id = validarEsquema(esquemaId, eventoId);
    this.#exigirRol(usuario, "ORGANIZADOR");
    const evento = this.eventos.obtener(id);
    if (!evento) throw new ErrorNoEncontrado("Evento inexistente");
    if (evento.organizador.id !== usuario.id) throw new ErrorPermiso("El evento pertenece a otro organizador");
    const ahora = this.reloj();
    return {
      tiposEntrada: evento.tiposEntrada.map((tipo) => ({
        nombre: tipo.nombre, cupo: tipo.cupo,
        cupoDisponible: tipo.cupo - this.compras.cantidadComprada(id, tipo.nombre),
      })),
      ventas: this.compras.listarPorEvento(id).map((compra) => ({
        compra,
        puedeConfirmar: compra.estado === PENDIENTE && evento.fechaFin > ahora,
        puedeMarcarUtilizada: compra.estado === CONFIRMADA && evento.fecha <= ahora,
      })),
    };
  }

  listarMensajes(compraId, usuario) {
    const compra = this.obtenerDeParticipante(compraId, usuario);
    return compra.mensajes;
  }

  notificacionesMensajes(usuario) {
    const compras = usuario?.rol === "COMPRADOR"
      ? this.compras.listarPorComprador(usuario.id) : this.#comprasComoOrganizador(usuario);
    return compras.flatMap((compra) => {
      const pendientes = compra.mensajesPendientes(usuario.id);
      if (pendientes.length === 0) return [];
      return [{ compra, cantidad: pendientes.length, ultimo: pendientes.at(-1) }];
    }).sort((primera, segunda) => segunda.ultimo.enviado - primera.ultimo.enviado);
  }

  #comprasComoOrganizador(usuario) {
    this.#exigirRol(usuario, "ORGANIZADOR");
    return this.compras.listarPorOrganizador(usuario.id);
  }

  marcarMensajesLeidos(compraId, { hasta } = {}, usuario) {
    const entrada = validarEsquema(esquemaLecturaMensajes, { hasta });
    const compra = this.obtenerDeParticipante(compraId, usuario);
    compra.marcarMensajesLeidos(usuario.id, entrada.hasta);
  }

  enviarMensaje(compraId, { mensaje } = {}, usuario) {
    const entrada = validarEsquema(esquemaMensaje, { mensaje });
    const compra = this.obtenerDeParticipante(compraId, usuario);
    const nuevo = new Mensaje({ usuario, mensaje: entrada.mensaje, enviado: new Date(this.reloj()) });
    compra.agregarMensaje(nuevo);
    return nuevo;
  }

  cancelar(compraId, usuario) {
    const compra = this.obtenerDeComprador(compraId, usuario);
    const ahora = this.reloj();
    if (!this.#puedeCancelar(compra, ahora)) throw new ErrorConflicto("La compra no se puede cancelar");
    const estado = compra.estado === CONFIRMADA ? REEMBOLSADA : CANCELADA;
    this.#cambiarEstado(compra, estado, usuario, ahora);
    return compra;
  }

  cambiarVenta(compraId, { estado } = {}, usuario) {
    const entrada = validarEsquema(esquemaCambioVenta, { estado });
    this.#exigirRol(usuario, "ORGANIZADOR");
    const compra = this.obtenerDeParticipante(compraId, usuario);
    const ahora = this.reloj();
    if (entrada.estado === CONFIRMADA && compra.evento.fechaFin <= ahora) {
      throw new ErrorConflicto("El evento ya finalizó");
    }
    if (entrada.estado === UTILIZADA && compra.evento.fecha > ahora) {
      throw new ErrorConflicto("El evento todavía no empezó");
    }
    this.#cambiarEstado(compra, entrada.estado, usuario, ahora);
    return compra;
  }

  obtenerDeComprador(compraId, usuario) {
    this.#exigirRol(usuario, "COMPRADOR");
    return this.obtenerDeParticipante(compraId, usuario);
  }

  obtenerDeParticipante(compraId, usuario) {
    const id = validarEsquema(esquemaId, compraId);
    const compra = this.compras.obtener(id);
    if (!compra) throw new ErrorNoEncontrado("Compra inexistente");
    const participante = (usuario?.rol === "COMPRADOR" && usuario.id === compra.comprador.id)
      || (usuario?.rol === "ORGANIZADOR" && usuario.id === compra.evento.organizador.id);
    if (!participante) throw new ErrorPermiso("La compra pertenece a otros participantes");
    return compra;
  }

  #exigirRol(usuario, rol) {
    if (usuario?.rol !== rol) throw new ErrorPermiso("El rol no permite realizar esta operación");
  }

  #puedeCancelar(compra, ahora) {
    return (compra.estado === PENDIENTE || compra.estado === CONFIRMADA) && compra.evento.fecha > ahora;
  }

  #cambiarEstado(compra, estado, usuario, ahora) {
    const cambio = new CambioEstadoCompra({ compra, estado, quien: usuario, fechaHora: new Date(ahora) });
    compra.actualizarEstado(estado);
    this.compras.registrarCambio(cambio);
  }
}
