import { ErrorAplicacion } from "./ErrorAplicacion.js";

export class ErrorValidacion extends ErrorAplicacion {
  constructor(mensaje) { super(mensaje, 400); }
}

export class ErrorAutenticacion extends ErrorAplicacion {
  constructor(mensaje) { super(mensaje, 401); }
}

export class ErrorPermiso extends ErrorAplicacion {
  constructor(mensaje) { super(mensaje, 403); }
}

export class ErrorNoEncontrado extends ErrorAplicacion {
  constructor(mensaje) { super(mensaje, 404); }
}

export class ErrorConflicto extends ErrorAplicacion {
  constructor(mensaje) { super(mensaje, 409); }
}
