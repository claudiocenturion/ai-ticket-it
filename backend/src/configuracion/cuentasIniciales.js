import { RolUsuario } from "../dominio/RolUsuario.js";
import { Usuario } from "../dominio/Usuario.js";
import { UsuariosEnMemoria } from "../repositorios/UsuariosEnMemoria.js";

const cuentas = [
  {
    nombreUsuario: "claudio", email: "claudio@me.com", nombre: "Claudio", apellido: "Centurion",
    rol: RolUsuario.COMPRADOR, hash: "$2b$12$vtwejScNpFSSPKP5S5ZAbOZssDxjW0mdzzJ8vSs.7HU1a052p6peG",
  },
  {
    nombreUsuario: "cine_banfield", email: "cine@me.com", nombre: "Cine", apellido: "Banfield",
    rol: RolUsuario.ORGANIZADOR, hash: "$2b$12$n1vda.7NNAWnXPLtQUJv9OI6b48AxhdIkSeaMmgTlRok5WL8JM53a",
  },
];

export const crearUsuariosIniciales = () => {
  const usuarios = new UsuariosEnMemoria();
  for (const { nombreUsuario, email, hash, ...perfil } of cuentas) {
    usuarios.guardar(new Usuario(perfil), email, hash, nombreUsuario);
  }
  return usuarios;
};
