const funciones = [
  {
    nombre: "Avengers: Doomsday",
    descripcion: "Función de demostración de Cine Banfield. Queda una entrada General para probar la compra.",
    dias: 2, hora: 20,
    tiposEntrada: [{ nombre: "General", precio: 6500, cupo: 1 }],
  },
  {
    nombre: "Interestelar",
    descripcion: "Función especial de ciencia ficción en Cine Banfield.",
    dias: 3, hora: 21,
    tiposEntrada: [
      { nombre: "General", precio: 5500, cupo: 40 },
      { nombre: "Preferencial", precio: 7500, cupo: 12 },
    ],
  },
  {
    nombre: "El viaje de Chihiro",
    descripcion: "Función de animación para toda la familia en Cine Banfield.",
    dias: 5, hora: 17,
    tiposEntrada: [{ nombre: "General", precio: 4800, cupo: 35 }],
  },
  {
    nombre: "Jurassic Park",
    descripcion: "Proyección especial de un clásico de aventuras en Cine Banfield.",
    dias: 7, hora: 19,
    tiposEntrada: [{ nombre: "General", precio: 5000, cupo: 45 }],
  },
];

export const cargarFuncionesIniciales = (eventos, usuarios, reloj) => {
  const { usuario: organizador } = usuarios.buscarCuenta("cine_banfield");
  const ahora = reloj();
  for (const { dias, hora, ...funcion } of funciones) {
    const inicio = new Date(ahora);
    inicio.setDate(inicio.getDate() + dias);
    inicio.setHours(hora, 0, 0, 0);
    eventos.crear({ ...funcion, categoria: "Cine", fecha: inicio.toISOString() }, organizador);
  }
};
