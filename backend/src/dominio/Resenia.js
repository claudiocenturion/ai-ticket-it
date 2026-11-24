import { ErrorValidacion } from "./Errores.js";
import { Entidad } from "./Entidad.js";
import { Evento } from "./Evento.js";
import { Usuario } from "./Usuario.js";

export class Resenia extends Entidad {
  constructor({ comprador, evento, detalle, puntuacion }) {
    super();
    if (!(comprador instanceof Usuario) || !(evento instanceof Evento)) {
      throw new ErrorValidacion("La reseña requiere un comprador y un evento");
    }
    if (typeof detalle !== "string" || !detalle.trim() || !Number.isFinite(puntuacion)
      || puntuacion < 1 || puntuacion > 5) {
      throw new ErrorValidacion("La reseña requiere un detalle y un puntaje entre 1 y 5");
    }
    Object.assign(this, { comprador, evento, detalle: detalle.trim(), puntuacion });
    Object.freeze(this);
  }
}
