import { salidaCategoria, salidaEvento } from "../dtos/evento.js";

export class EventosController {
  constructor(service) {
    this.service = service;
  }

  crear = async (req, res, next) => {
    try {
      const evento = await this.service.publicar(req.body, res.locals.usuario);
      res.status(201).json(salidaEvento(evento));
    } catch (error) {
      next(error);
    }
  };

  buscar = async (req, res, next) => {
    try {
      const eventos = await this.service.buscarConDisponibilidad(req.query);
      res.json(eventos.map(salidaEvento));
    } catch (error) {
      next(error);
    }
  };

  categorias = (req, res) => res.json(this.service.listarCategorias().map(salidaCategoria));
}

