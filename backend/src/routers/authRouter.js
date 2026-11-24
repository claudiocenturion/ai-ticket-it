import { Router } from "express";
import { AuthController } from "../controllers/AuthController.js";

export const authRouter = (service, autenticar) => {
  const router = Router();
  const controller = new AuthController(service);
  router.post("/registro", controller.registrar);
  router.post("/ingreso", controller.ingresar);
  router.get("/yo", autenticar, controller.yo);
  return router;
};
