import { ErrorPermiso } from "../dominio/Errores.js";

export const autenticar = (auth) => (req, res, next) => {
  try {
    const token = req.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
    res.locals.usuario = auth.autenticar(token);
    next();
  } catch (error) {
    next(error);
  }
};

export const requerirRol = (rol) => (req, res, next) => {
  if (res.locals.usuario?.rol !== rol) return next(new ErrorPermiso("El rol no permite realizar esta operación"));
  next();
};
