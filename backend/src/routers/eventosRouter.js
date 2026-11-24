import { Router } from "express";
import { EventosController } from "../controllers/eventosController.js";
import { ComprasController } from "../controllers/ComprasController.js";
import { requerirRol } from "../middlewares/autenticacion.js";
import { RolUsuario } from "../dominio/RolUsuario.js";

export const eventosRouter = (service, compras, gestion, autenticar) => {
  const router = Router();
  const controller = new EventosController(service);
  const comprasController = new ComprasController(compras);
  const organizador = requerirRol(RolUsuario.ORGANIZADOR);
  const comprador = requerirRol(RolUsuario.COMPRADOR);
  router.get("/", controller.buscar);
  router.get("/categorias", controller.categorias);
  router.post("/", autenticar, organizador, controller.crear);
  router.get("/propios", autenticar, organizador, gestion.eventosPropios);
  router.get("/:eventoId/ventas", autenticar, organizador, gestion.ventas);
  router.get("/:eventoId/resenias", gestion.reseniasAnteriores);
  router.post("/:eventoId/compras", autenticar, comprador, comprasController.comprar);
  return router;
};

