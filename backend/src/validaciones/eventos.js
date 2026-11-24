import { z } from "zod";

const textoObligatorio = z.string({ error: "Nombre, descripción, categoría y fecha deben ser texto no vacío" })
  .trim().min(1, "Nombre, descripción, categoría y fecha deben ser texto no vacío");
const filtro = z.string({ error: "Usá un único valor por filtro" }).default("");

const fechaIso = textoObligatorio.refine(
  (valor) => Number.isFinite(Date.parse(valor)) && new Date(valor).toISOString() === valor,
  "La fecha debe ser válida y estar en formato ISO UTC",
);

export const esquemaFiltrosEvento = z.object({
  texto: filtro, categoria: filtro,
  orden: z.enum(["fecha", "precio", "puntaje"], { error: "Orden de eventos inválido" }).optional(),
});

export const esquemaEvento = z.object({
  nombre: textoObligatorio,
  descripcion: textoObligatorio,
  categoria: textoObligatorio,
  fecha: fechaIso,
  fechaFin: fechaIso.optional(),
  imagenUrl: z.string({ error: "La URL de imagen debe ser texto" }).refine(
    (valor) => !valor || ["http:", "https:"].includes(URL.parse(valor)?.protocol),
    "La imagen debe tener una URL HTTP o HTTPS válida",
  ).optional(),
  tiposEntrada: z.array(z.object({
    nombre: z.string({ error: "El tipo de entrada necesita un nombre" }).trim()
      .min(1, "El tipo de entrada necesita un nombre"),
    precio: z.number({ error: "El precio debe ser un número no negativo" })
      .nonnegative("El precio debe ser un número no negativo"),
    cupo: z.int({ error: "El cupo debe ser un entero positivo" }).positive("El cupo debe ser un entero positivo"),
  }), { error: "El evento necesita al menos un tipo de entrada" })
    .min(1, "El evento necesita al menos un tipo de entrada"),
}, { error: "El cuerpo del evento debe ser un objeto" });
