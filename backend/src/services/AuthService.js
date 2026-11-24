import bcrypt from "bcrypt";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { ErrorAutenticacion, ErrorPermiso } from "../dominio/Errores.js";
import { Usuario } from "../dominio/Usuario.js";
import { RolUsuario } from "../dominio/RolUsuario.js";
import { esquemaIngreso, esquemaRegistro } from "../validaciones/auth.js";
import { validarEsquema } from "../validaciones/validarEsquema.js";

const rondas = 12;
const hashSinCuenta = bcrypt.hashSync(randomBytes(32).toString("hex"), rondas);
const digerirCodigo = (codigo) => createHash("sha256").update(codigo).digest();

export class AuthService {
  constructor(usuarios, jwt, codigoOrganizador) {
    Object.assign(this, { usuarios, jwt });
    this.codigoOrganizador = codigoOrganizador ? digerirCodigo(codigoOrganizador) : null;
  }

  async registrar({ nombre, apellido, email, clave, rol, codigoOrganizador } = {}) {
    const entrada = validarEsquema(esquemaRegistro, { nombre, apellido, email, clave, rol, codigoOrganizador });
    if (entrada.rol === RolUsuario.ORGANIZADOR && (!this.codigoOrganizador || !entrada.codigoOrganizador
      || !timingSafeEqual(this.codigoOrganizador, digerirCodigo(entrada.codigoOrganizador)))) {
      throw new ErrorPermiso("El código de alta de organizador es inválido");
    }
    const hash = await bcrypt.hash(entrada.clave, rondas);
    const usuario = this.usuarios.guardar(new Usuario(entrada), entrada.email, hash);
    return { usuario, token: this.jwt.emitir(usuario) };
  }

  async ingresar({ identificador, email, clave } = {}) {
    const entrada = validarEsquema(esquemaIngreso, { identificador: identificador ?? email, clave });
    const cuenta = this.usuarios.buscarCuenta(entrada.identificador);
    const coincide = await bcrypt.compare(entrada.clave, cuenta?.hash ?? hashSinCuenta);
    if (!cuenta || !coincide) throw new ErrorAutenticacion("Usuario o contraseña incorrectos");
    return { usuario: cuenta.usuario, token: this.jwt.emitir(cuenta.usuario) };
  }

  autenticar(token) {
    if (!token) throw new ErrorAutenticacion("Iniciá sesión para continuar");
    const { sub, rol } = this.jwt.verificar(token);
    const usuario = this.usuarios.obtener(sub);
    if (usuario?.rol !== rol) {
      throw new ErrorAutenticacion("Sesión inválida o vencida");
    }
    return usuario;
  }
}
