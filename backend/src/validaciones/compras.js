import { z } from "zod";

export const esquemaCompra = z.object({
  params: z.object({
    eventoId: z.string({ error: "El identificador del evento es obligatorio" }).trim()
      .min(1, "El identificador del evento es obligatorio"),
  }, { error: "El identificador del evento es obligatorio" }),
  body: z.object({
    tipoEntrada: z.string({ error: "Elegí un tipo de entrada" }).trim().min(1, "Elegí un tipo de entrada"),
    cantidad: z.int({ error: "La cantidad debe ser un entero positivo" })
      .positive("La cantidad debe ser un entero positivo"),
  }, { error: "El cuerpo de la compra debe ser un objeto" }),
});

export const esquemaId = z.string({ error: "Falta el identificador" }).trim().min(1, "Falta el identificador");

export const esquemaMensaje = z.object({
  mensaje: z.string({ error: "Ingresá un mensaje" }).trim().min(1, "Ingresá un mensaje"),
}, { error: "Ingresá un mensaje" });

export const esquemaLecturaMensajes = z.object({
  hasta: z.int({ error: "La posición de lectura es inválida" }).nonnegative("La posición de lectura es inválida"),
}, { error: "La posición de lectura es inválida" });

export const esquemaCambioVenta = z.object({
  estado: z.enum(["CONFIRMADA", "UTILIZADA"], { error: "Estado de venta inválido" }),
}, { error: "Estado de venta inválido" });
