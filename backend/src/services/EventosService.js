import { Evento } from "../dominio/Evento.js";
import { ErrorConflicto, ErrorPermiso, ErrorValidacion } from "../dominio/Errores.js";
import { CategoriasEnMemoria } from "../repositorios/CategoriasEnMemoria.js";
import { esquemaEvento, esquemaFiltrosEvento } from "../validaciones/eventos.js";
import { validarEsquema } from "../validaciones/validarEsquema.js";

const normalizar = (texto) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

export class EventosService {
  constructor(repositorio, reloj = Date.now, compras, resenias, categorias = new CategoriasEnMemoria()) {
    this.repositorio = repositorio;
    this.reloj = reloj;
    this.compras = compras;
    this.resenias = resenias;
    this.categorias = categorias;
  }

  crear(body, usuario) {
    const entrada = validarEsquema(esquemaEvento, body);
    if (usuario?.rol !== "ORGANIZADOR") {
      throw new ErrorPermiso("Solo un organizador puede crear eventos");
    }
    const { categoria, fecha, fechaFin, imagenUrl, ...datos } = entrada;
    const nombreCategoria = normalizar(categoria);
    const categoriaEvento = this.listarCategorias().find(({ nombre }) => normalizar(nombre) === nombreCategoria);
    if (!categoriaEvento) throw new ErrorValidacion("Elegí una categoría del catálogo");
    const evento = new Evento({
      ...datos, organizador: usuario, categoria: categoriaEvento,
      fecha: new Date(fecha), fechaFin: fechaFin === undefined ? undefined : new Date(fechaFin),
      multimedia: imagenUrl ? [imagenUrl] : [],
    });
    if (evento.fecha.getTime() <= this.reloj()) {
      throw new ErrorConflicto("La fecha del evento debe ser futura");
    }
    return this.repositorio.guardar(evento);
  }

  listarCategorias() {
    return this.categorias.listar();
  }

  buscar(filtros) {
    const { texto, categoria, orden } = validarEsquema(esquemaFiltrosEvento, filtros ?? {});
    const consulta = normalizar(texto);
    const filtro = normalizar(categoria);
    const eventos = this.repositorio.listar()
      .filter((evento) => normalizar(`${evento.nombre} ${evento.descripcion}`).includes(consulta)
        && (!filtro || normalizar(evento.categoria.nombre) === filtro));
    return this.#ordenar(eventos, orden);
  }

  publicar(datos, usuario) {
    return this.#conDisponibilidad(this.crear(datos, usuario));
  }

  buscarConDisponibilidad(filtros) {
    return this.buscar(filtros).map((evento) => this.#conDisponibilidad(evento));
  }

  #conDisponibilidad(evento) {
    const tiposEntrada = evento.tiposEntrada.map((tipo) => ({
      ...tipo,
      cupoDisponible: tipo.cupo - (this.compras?.cantidadComprada(evento.id, tipo.nombre) ?? 0),
    }));
    return { ...evento, id: evento.id, fecha: evento.fecha, fechaFin: evento.fechaFin, tiposEntrada };
  }

  #ordenar(eventos, orden) {
    const porFecha = (primero, segundo) => primero.fecha - segundo.fecha;
    if (orden === "fecha" || orden === undefined) return eventos.sort(porFecha);
    const criterio = orden === "precio"
      ? (evento) => Math.min(...evento.tiposEntrada.map(({ precio }) => precio))
      : (evento) => -(this.#puntaje(evento) ?? -1);
    return eventos.map((evento) => ({ evento, valor: criterio(evento) }))
      .sort((primero, segundo) => primero.valor - segundo.valor || porFecha(primero.evento, segundo.evento))
      .map(({ evento }) => evento);
  }

  #puntaje(evento) {
    const resenias = this.resenias?.anterioresA(evento) ?? [];
    if (resenias.length === 0) return null;
    return resenias.reduce((total, { puntuacion }) => total + puntuacion, 0) / resenias.length;
  }
}

