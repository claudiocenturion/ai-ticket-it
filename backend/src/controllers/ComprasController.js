import { salidaCompra } from "../dtos/compra.js";

export class ComprasController {
  constructor(service) {
    this.service = service;
  }

  comprar = async (req, res, next) => {
    try {
      const compra = await this.service.comprar(req.params.eventoId, req.body, res.locals.usuario);
      res.status(201).json(salidaCompra(compra));
    } catch (error) {
      next(error);
    }
  };
}
