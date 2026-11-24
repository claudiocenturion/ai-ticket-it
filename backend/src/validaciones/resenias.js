import { z } from "zod";

export const esquemaResenia = z.object({
  detalle: z.string({ error: "Ingresá un comentario" }).trim().min(1, "Ingresá un comentario"),
  puntuacion: z.number({ error: "Ingresá un puntaje entre 1 y 5" })
    .min(1, "Ingresá un puntaje entre 1 y 5").max(5, "Ingresá un puntaje entre 1 y 5"),
}, { error: "Ingresá una reseña" });
