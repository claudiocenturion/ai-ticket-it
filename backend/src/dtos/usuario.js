export const salidaUsuario = ({ id, nombre, apellido, rol }) => ({ id, nombre, apellido, rol });

export const salidaSesion = ({ usuario, token }) => ({ usuario: salidaUsuario(usuario), token });
