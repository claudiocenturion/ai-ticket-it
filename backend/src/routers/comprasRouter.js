import { Router } from "express";
import { requerirRol } from "../middlewares/autenticacion.js";
import { RolUsuario } from "../dominio/RolUsuario.js";

export const comprasRouter = (controller, autenticar) => {
  const router = Router();
  const comprador = requerirRol(RolUsuario.COMPRADOR);
  router.use(autenticar);
  router.get("/", comprador, controller.propias);
  router.get("/mensajes/pendientes", controller.notificacionesMensajes);
  router.get("/:compraId/mensajes", controller.mensajes);
  router.post("/:compraId/mensajes", controller.enviarMensaje);
  router.post("/:compraId/mensajes/lectura", controller.leerMensajes);
  router.post("/:compraId/cancelacion", comprador, controller.cancelar);
  router.patch("/:compraId/estado", requerirRol(RolUsuario.ORGANIZADOR), controller.cambiarVenta);
  router.post("/:compraId/resenia", comprador, controller.publicarResenia);
  return router;
};
