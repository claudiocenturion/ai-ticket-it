import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { ErrorAutenticacion } from "../dominio/Errores.js";
import { RolUsuario } from "../dominio/RolUsuario.js";

const emisor = "ai-ticket-it";
const audiencia = "ai-ticket-it-app";

export class JwtService {
  constructor(secreto = randomBytes(48), reloj = Date.now) {
    if (Buffer.byteLength(secreto) < 32) throw new Error("JWT_SECRET debe tener al menos 32 bytes");
    this.secreto = secreto;
    this.reloj = reloj;
  }

  emitir(usuario) {
    const emitido = this.ahora();
    const expira = emitido + 3600;
    return jwt.sign({ rol: usuario.rol, iat: emitido, exp: expira }, this.secreto, {
      algorithm: "HS256", issuer: emisor, audience: audiencia, subject: usuario.id,
    });
  }

  verificar(token) {
    let datos;
    try {
      datos = jwt.verify(token, this.secreto, {
        algorithms: ["HS256"], issuer: emisor, audience: audiencia, clockTimestamp: this.ahora(),
      });
    } catch (error) {
      if (!(error instanceof jwt.JsonWebTokenError)) throw error;
      throw new ErrorAutenticacion("Sesión inválida o vencida");
    }
    if (typeof datos.sub !== "string" || !Number.isInteger(datos.exp)
      || !Object.values(RolUsuario).includes(datos.rol)) {
      throw new ErrorAutenticacion("Sesión inválida o vencida");
    }
    return datos;
  }

  ahora() {
    return Math.floor(this.reloj() / 1000);
  }
}
