import { Categoria } from "../dominio/Categoria.js";

const categoriasIniciales = [
  ["Música", "Conciertos y recitales"],
  ["Teatro", "Obras y espectáculos teatrales"],
  ["Cine", "Proyecciones y ciclos de cine"],
  ["Deportes", "Competencias y encuentros deportivos"],
  ["Festivales", "Festivales y encuentros culturales"],
  ["Arte y danza", "Muestras, exposiciones y espectáculos de danza"],
  ["Gastronomía", "Ferias, degustaciones y encuentros gastronómicos"],
  ["Talleres", "Clases y actividades prácticas"],
  ["Conferencias", "Charlas y conferencias"],
  ["Infantil", "Actividades para niñas y niños"],
  ["Otros", "Eventos de otras categorías"],
];

export class CategoriasEnMemoria {
  #categorias = categoriasIniciales.map(([nombre, descripcion]) => new Categoria({ nombre, descripcion }));

  listar() {
    return [...this.#categorias];
  }
}
