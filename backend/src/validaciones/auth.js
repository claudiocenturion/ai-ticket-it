import { z } from "zod";
import { RolUsuario } from "../dominio/RolUsuario.js";

const email = z.string({ error: "Ingresá un correo válido" }).trim().toLowerCase()
  .pipe(z.email({ error: "Ingresá un correo válido" }));
const clave = z.string({ error: "Ingresá una contraseña" }).min(1, "Ingresá una contraseña")
  .refine((valor) => Buffer.byteLength(valor, "utf8") <= 72, "La contraseña admite hasta 72 bytes");
const nombre = z.string({ error: "Completá el nombre y el apellido" }).trim()
  .min(1, "Completá el nombre y el apellido").max(80, "Usá hasta 80 caracteres");

const identificador = z.string({ error: "Ingresá un usuario o correo" }).trim().toLowerCase()
  .min(1, "Ingresá un usuario o correo").max(254, "El usuario o correo es demasiado largo");

export const esquemaIngreso = z.object({ identificador, clave }, { error: "Ingresá el usuario y la contraseña" });

export const esquemaRegistro = z.object({
  email,
  clave: clave.min(8, "Usá al menos 8 caracteres para la contraseña"),
  nombre,
  apellido: nombre,
  rol: z.enum(RolUsuario, { error: "Elegí un rol válido" }).default(RolUsuario.COMPRADOR),
  codigoOrganizador: z.string().max(256).optional(),
}, { error: "Completá los datos de tu cuenta" });
