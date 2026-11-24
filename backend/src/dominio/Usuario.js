import { ErrorValidacion } from "./Errores.js";
import { Evento } from "./Evento.js";
import { Entidad } from "./Entidad.js";
import { RolUsuario } from "./RolUsuario.js";

export class Usuario extends Entidad {
  constructor({ nombre, apellido, rol, favoritos = [] }) {
    super();
    if (![nombre, apellido].every((valor) => typeof valor === "string" && valor.trim())) {
      throw new ErrorValidacion("El usuario requiere nombre y apellido");
    }
    if (!Object.values(RolUsuario).includes(rol)) {
      throw new ErrorValidacion("El rol de usuario es inválido");
    }
    if (!Array.isArray(favoritos) || favoritos.some((evento) => !(evento instanceof Evento))) {
      throw new ErrorValidacion("Los favoritos deben ser eventos");
    }
    Object.assign(this, { nombre: nombre.trim(), apellido: apellido.trim(), rol });
    this.favoritos = Object.freeze([...favoritos]);
    Object.freeze(this);
  }
}
