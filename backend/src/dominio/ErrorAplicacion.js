export class ErrorAplicacion extends Error {
  constructor(mensaje, estado = 400) {
    super(mensaje);
    this.name = new.target.name;
    this.estado = estado;
  }
}

