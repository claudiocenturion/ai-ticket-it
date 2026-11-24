import { salidaSesion, salidaUsuario } from "../dtos/usuario.js";

export class AuthController {
  constructor(service) {
    this.service = service;
  }

  registrar = async (req, res, next) => {
    try {
      res.set("Cache-Control", "no-store").status(201).json(salidaSesion(await this.service.registrar(req.body)));
    } catch (error) {
      next(error);
    }
  };

  ingresar = async (req, res, next) => {
    try {
      res.set("Cache-Control", "no-store").json(salidaSesion(await this.service.ingresar(req.body)));
    } catch (error) {
      next(error);
    }
  };

  yo = (req, res) => res.set("Cache-Control", "no-store").json(salidaUsuario(res.locals.usuario));

}
