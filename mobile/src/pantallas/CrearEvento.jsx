import React, { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Boton } from "../componentes/Boton";
import { Campo } from "../componentes/Campo";
import { SelectorFecha } from "../componentes/SelectorFecha";
import { colores } from "../tema";
import { combinarFechaHora, decimal, diaLocal, enteroPositivo } from "../validacionesFormulario";
import { useConsulta } from "../hooks/useConsulta";

const tipoVacio = (id) => ({ id, nombre: "", precio: "", cupo: "" });
const campos = [
  ["nombre", "Nombre"],
  ["descripcion", "Descripción"],
];

const urlValida = (texto) => {
  try {
    return ["https:", "http:"].includes(new URL(texto).protocol);
  } catch {
    return false;
  }
};

const validarEvento = (datos, tipos, categorias) => {
  const errores = {};
  for (const [campo, etiqueta] of campos) {
    if (!datos[campo]?.trim()) errores[campo] = `Completá ${etiqueta.toLowerCase()}.`;
  }
  if (!categorias?.some(({ nombre }) => nombre === datos.categoria)) errores.categoria = "Elegí una categoría.";
  const inicio = combinarFechaHora(datos.fecha);
  const fin = combinarFechaHora(datos.fechaFin);
  if (!inicio) errores.fecha = "Elegí la fecha y la hora de inicio.";
  else if (inicio.getTime() <= Date.now()) errores.fecha = "Elegí una fecha futura.";
  if ((datos.fechaFin?.dia || datos.fechaFin?.hora) && !fin) errores.fechaFin = "Elegí la fecha y la hora de fin, o quitá el fin.";
  else if (fin && inicio && fin < inicio) errores.fechaFin = "El fin debe ser igual o posterior al inicio.";
  const imagenUrl = datos.imagenUrl?.trim();
  if (imagenUrl && !urlValida(imagenUrl)) errores.imagenUrl = "Ingresá una URL con http:// o https://.";

  const nombres = new Set();
  const erroresTipos = tipos.map(({ nombre, precio, cupo }) => {
    const error = {};
    const clave = nombre.trim().toLowerCase();
    if (!clave) error.nombre = "Ingresá el nombre de la entrada.";
    else if (nombres.has(clave)) error.nombre = "Ya hay un tipo de entrada con ese nombre.";
    nombres.add(clave);
    if (decimal(precio) === null) error.precio = "Ingresá un precio válido, por ejemplo 1500,50 o 0.";
    if (enteroPositivo(cupo) === null) error.cupo = "Ingresá un cupo entero mayor que cero.";
    return error;
  });
  return { errores, erroresTipos, inicio, fin, imagenUrl };
};

export const CrearEvento = ({ api, irAVentas }) => {
  const [datos, setDatos] = useState({});
  const [tipos, setTipos] = useState([tipoVacio(0)]);
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [intento, setIntento] = useState(false);
  const siguienteTipo = useRef(1);
  const enCurso = useRef(false);
  const { datos: categorias, cargando, error: errorCategorias, actualizar } = useConsulta(api.categorias);
  const { errores, erroresTipos, inicio, fin, imagenUrl } = validarEvento(datos, tipos, categorias);
  const invalido = Object.keys(errores).length > 0 || erroresTipos.some((error) => Object.keys(error).length);
  const asignar = (campo, valor) => setDatos((actuales) => ({ ...actuales, [campo]: valor }));
  const hoy = diaLocal(new Date());

  const actualizarTipo = (indice, campo, valor) => {
    setTipos((actuales) => actuales.map((tipo, posicion) =>
      posicion === indice ? { ...tipo, [campo]: valor } : tipo));
  };

  const publicar = async () => {
    if (enCurso.current) return;
    setIntento(true);
    setMensaje("");
    if (invalido) return;
    enCurso.current = true;
    setEnviando(true);
    try {
      await api.crear({
        nombre: datos.nombre.trim(), descripcion: datos.descripcion.trim(), categoria: datos.categoria.trim(),
        fecha: inicio.toISOString(), fechaFin: fin?.toISOString(), imagenUrl: imagenUrl || undefined,
        tiposEntrada: tipos.map(({ nombre, precio, cupo }) => ({
          nombre: nombre.trim(), precio: decimal(precio), cupo: enteroPositivo(cupo),
        })),
      });
      setMensaje("Evento publicado");
      setIntento(false);
      setDatos({});
      setTipos([tipoVacio(siguienteTipo.current++)]);
    } catch (error) {
      setMensaje(error.message);
    } finally {
      enCurso.current = false;
      setEnviando(false);
    }
  };

  return (
    <View style={estilos.formulario}>
      <Text accessibilityRole="header" style={estilos.titulo}>Crear evento</Text>
      {campos.map(([campo, etiqueta]) => (
        <Campo key={campo} etiqueta={etiqueta} value={datos[campo] ?? ""}
          error={errores[campo]} mostrarError={intento} editable={!enviando} multiline={campo === "descripcion"}
          requerido onChangeText={(valor) => asignar(campo, valor)} />
      ))}
      <View style={estilos.grupo}>
        <Text style={estilos.etiqueta}>Categoría</Text>
        {cargando && <Text accessibilityLiveRegion="polite">Cargando categorías…</Text>}
        {errorCategorias && <>
          <Text accessibilityLiveRegion="polite" style={estilos.error}>{errorCategorias}</Text>
          <Boton title="Reintentar categorías" variante="discreto" onPress={actualizar} />
        </>}
        <View style={estilos.opciones}>
          {categorias?.map(({ nombre }) => (
            <Boton key={nombre} title={nombre} seleccionado={datos.categoria === nombre} disabled={enviando}
              variante={datos.categoria === nombre ? "principal" : "secundario"} onPress={() => asignar("categoria", nombre)} />
          ))}
        </View>
        {intento && errores.categoria && <Text accessibilityLiveRegion="polite" style={estilos.error}>{errores.categoria}</Text>}
      </View>
      <SelectorFecha titulo="Inicio del evento" sufijo="inicio" value={datos.fecha}
        minimo={hoy} error={intento ? errores.fecha : undefined}
        disabled={enviando} onChange={(valor) => asignar("fecha", valor)} />
      <SelectorFecha titulo="Fin del evento" sufijo="fin" value={datos.fechaFin}
        minimo={datos.fecha?.dia && datos.fecha.dia > hoy ? datos.fecha.dia : hoy}
        error={intento ? errores.fechaFin : undefined} opcional
        disabled={enviando} onChange={(valor) => asignar("fechaFin", valor)} />
      <Campo etiqueta="URL de imagen (opcional)" value={datos.imagenUrl ?? ""} error={errores.imagenUrl}
        mostrarError={intento} editable={!enviando} keyboardType="url" autoCapitalize="none"
        onChangeText={(valor) => asignar("imagenUrl", valor)} />
      {tipos.map((tipo, indice) => (
        <View key={tipo.id} style={estilos.tipo}>
          <Campo etiqueta={`Tipo ${indice + 1}`} value={tipo.nombre} error={erroresTipos[indice].nombre}
            mostrarError={intento} editable={!enviando} requerido onChangeText={(valor) => actualizarTipo(indice, "nombre", valor)} />
          <Campo etiqueta={`Precio ${indice + 1}`} value={tipo.precio} keyboardType="decimal-pad"
            error={erroresTipos[indice].precio} mostrarError={intento} editable={!enviando} requerido
            onChangeText={(valor) => actualizarTipo(indice, "precio", valor)} />
          <Campo etiqueta={`Cupo ${indice + 1}`} value={tipo.cupo} keyboardType="number-pad"
            error={erroresTipos[indice].cupo} mostrarError={intento} editable={!enviando} requerido
            onChangeText={(valor) => actualizarTipo(indice, "cupo", valor)} />
          {tipos.length > 1 && <Boton title={`Quitar tipo ${indice + 1}`} variante="discreto" disabled={enviando}
            onPress={() => setTipos((actuales) => actuales.filter(({ id }) => id !== tipo.id))} />}
        </View>
      ))}
      <Boton title="Agregar tipo de entrada" variante="secundario" disabled={enviando} onPress={() => {
        const nuevo = tipoVacio(siguienteTipo.current++);
        setTipos((actuales) => [...actuales, nuevo]);
      }} />
      <Boton title="Publicar evento" onPress={publicar} ocupado={enviando} />
      {intento && invalido && <Text accessibilityRole="alert" style={estilos.error}>Revisá los campos marcados.</Text>}
      {mensaje ? <Text accessibilityLiveRegion="polite">{mensaje}</Text> : null}
      {mensaje === "Evento publicado" && irAVentas && <Boton title="Ir a ventas" variante="secundario" onPress={irAVentas} />}
    </View>
  );
};

const estilos = StyleSheet.create({
  formulario: { gap: 10, backgroundColor: colores.superficie, padding: 16, borderRadius: 16 },
  titulo: { color: colores.texto, fontWeight: "700", fontSize: 22 },
  tipo: { backgroundColor: colores.fondo, borderColor: colores.separador, borderWidth: 1, borderRadius: 12, padding: 12 },
  grupo: { gap: 8 },
  etiqueta: { color: colores.texto, fontWeight: "700" },
  opciones: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  error: { color: colores.peligro },
});
