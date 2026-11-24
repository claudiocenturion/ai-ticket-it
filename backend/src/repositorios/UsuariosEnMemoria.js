import { randomUUID } from "node:crypto";
import { ErrorConflicto } from "../dominio/Errores.js";

export class UsuariosEnMemoria {
  #usuarios = new Map();
  #cuentas = new Map();

  guardar(usuario, email, hash, nombreUsuario) {
    if (this.#cuentas.has(email)) throw new ErrorConflicto("El correo ya está registrado");
    if (nombreUsuario && this.#cuentas.has(nombreUsuario)) throw new ErrorConflicto("El nombre de usuario ya está registrado");
    usuario.asignarId(randomUUID());
    this.#usuarios.set(usuario.id, usuario);
    const cuenta = Object.freeze({ usuario, email, nombreUsuario, hash });
    this.#cuentas.set(email, cuenta);
    if (nombreUsuario) this.#cuentas.set(nombreUsuario, cuenta);
    return usuario;
  }

  buscarCuenta(identificador) {
    return this.#cuentas.get(identificador);
  }

  obtener(id) {
    return this.#usuarios.get(id);
  }
}
