import express from "express";
import { manejarErrores, rutaInexistente } from "./middlewares/errores.js";
import { EventosEnMemoria } from "./repositorios/EventosEnMemoria.js";
import { eventosRouter } from "./routers/eventosRouter.js";
import { EventosService } from "./services/EventosService.js";
import { ComprasService } from "./services/ComprasService.js";
import { ComprasEnMemoria } from "./repositorios/ComprasEnMemoria.js";
import { ReseniasEnMemoria } from "./repositorios/ReseniasEnMemoria.js";
import { GestionComprasService } from "./services/GestionComprasService.js";
import { ReseniasService } from "./services/ReseniasService.js";
import { GestionComprasController } from "./controllers/GestionComprasController.js";
import { comprasRouter } from "./routers/comprasRouter.js";
import { authRouter } from "./routers/authRouter.js";
import { AuthService } from "./services/AuthService.js";
import { JwtService } from "./seguridad/JwtService.js";
import { UsuariosEnMemoria } from "./repositorios/UsuariosEnMemoria.js";
import { autenticar } from "./middlewares/autenticacion.js";
import { corsWeb } from "./middlewares/corsWeb.js";
import { registrarSolicitudes } from "./middlewares/registrarSolicitudes.js";
import { CategoriasEnMemoria } from "./repositorios/CategoriasEnMemoria.js";

export const crearApp = ({
  repositorio = new EventosEnMemoria(), repositorioCompras = new ComprasEnMemoria(),
  repositorioResenias = new ReseniasEnMemoria(), usuarios = new UsuariosEnMemoria(),
  reloj = Date.now, relojJwt = Date.now, secretoJwt, codigoOrganizador,
  origenesWeb = [], logger, repositorioCategorias = new CategoriasEnMemoria(), precargarEventos,
} = {}) => {
  const app = express();
  const eventos = new EventosService(repositorio, reloj, repositorioCompras, repositorioResenias, repositorioCategorias);
  precargarEventos?.(eventos, usuarios, reloj);
  const compras = new ComprasService(repositorio, repositorioCompras, reloj);
  const gestionCompras = new GestionComprasService(repositorio, repositorioCompras, repositorioResenias, reloj);
  const resenias = new ReseniasService(repositorio, gestionCompras, repositorioResenias, reloj);
  const gestion = new GestionComprasController(gestionCompras, resenias);

  const auth = new AuthService(usuarios, new JwtService(secretoJwt, relojJwt), codigoOrganizador);
  const usuarioAutenticado = autenticar(auth);

  if (logger) app.use(registrarSolicitudes(logger));
  app.use(corsWeb(origenesWeb));
  app.use(express.json());
  app.get("/health", (req, res) => res.json({ estado: "ok" }));
  const montarRouter = (ruta, router) => app.use(ruta, (req, res, next) => {
    res.locals.prefijoRuta = ruta;
    next();
  }, router);
  montarRouter("/api/auth", authRouter(auth, usuarioAutenticado));
  montarRouter("/api/eventos", eventosRouter(eventos, compras, gestion, usuarioAutenticado));
  montarRouter("/api/compras", comprasRouter(gestion, usuarioAutenticado));
  app.use(rutaInexistente);
  app.use(manejarErrores);

  return app;
};

