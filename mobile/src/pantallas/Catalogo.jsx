import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { Boton } from "../componentes/Boton";
import { Campo } from "../componentes/Campo";
import { ComprarEntradas } from "../componentes/ComprarEntradas";
import { ReseniasEvento } from "../componentes/ReseniasEvento";
import { formatearFecha } from "../formato";
import { colores } from "../tema";
import { useConsulta } from "../hooks/useConsulta";

const todos = { texto: "", categoria: "" };
const ordenes = [["fecha", "Fecha"], ["precio", "Precio"], ["puntaje", "Puntaje del organizador"]];

export const Catalogo = ({ api, irAMisCompras }) => {
  const [texto, setTexto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [filtros, setFiltros] = useState(todos);
  const { datos: categorias, error: errorCategorias, actualizar: recargarCategorias } = useConsulta(api.categorias);
  const [resultado, setResultado] = useState({ cargando: true });
  const [recarga, setRecarga] = useState(0);
  const [eventoConResenias, setEventoConResenias] = useState("");

  useEffect(() => {
    let vigente = true;
    setResultado((anterior) => anterior.filtros === filtros
      ? { ...anterior, error: undefined, cargando: true }
      : { filtros, cargando: true });
    api.buscar(filtros).then((eventos) => {
      if (!vigente) return;
      setResultado({ eventos, filtros });
    }).catch((error) => {
      if (vigente) setResultado((anterior) => ({ ...anterior, cargando: false, error: error.message }));
    });
    return () => { vigente = false; };
  }, [api, filtros, recarga]);

  const elegirCategoria = (valor) => {
    setCategoria(valor);
    setFiltros((anterior) => ({ ...anterior, texto, categoria: valor }));
  };

  return (
    <View style={{ gap: 12 }}>
      <Text accessibilityRole="header" style={estilos.titulo}>Explorá eventos</Text>
      <Campo etiqueta="Buscar eventos" value={texto} onChangeText={setTexto} returnKeyType="search"
        onSubmitEditing={() => setFiltros((anterior) => ({ ...anterior, texto: texto.trim(), categoria }))} />
      {errorCategorias && <>
        <Text accessibilityLiveRegion="polite">{errorCategorias}</Text>
        <Boton title="Reintentar categorías" variante="discreto" onPress={recargarCategorias} />
      </>}
      {categorias?.length > 0 && (
        <View style={estilos.categorias}>
          {["", ...categorias.map(({ nombre }) => nombre)].map((valor) => (
            <Boton key={valor} title={valor || "Todas las categorías"} seleccionado={categoria === valor}
              variante={categoria === valor ? "principal" : "secundario"} onPress={() => elegirCategoria(valor)} />
          ))}
        </View>
      )}
      <Boton title="Buscar" onPress={() => setFiltros((anterior) => ({ ...anterior, texto, categoria }))} />
      <Text>Ordenar por</Text>
      <View style={estilos.categorias}>
        {ordenes.map(([orden, etiqueta]) => (
          <Boton key={orden} title={etiqueta} seleccionado={(filtros.orden ?? "fecha") === orden}
            variante={(filtros.orden ?? "fecha") === orden ? "principal" : "secundario"}
            onPress={() => setFiltros({ texto, categoria, orden })} />
        ))}
      </View>
      {resultado.cargando && <ActivityIndicator accessibilityLabel="Cargando eventos" color={colores.primario} />}
      {resultado.error && <Text accessibilityLiveRegion="polite">{resultado.error}</Text>}
      {resultado.eventos?.length === 0 && <Text>No se encontraron eventos</Text>}
      {resultado.eventos?.map((evento) => (
        <View key={evento.id} style={estilos.evento}>
          {evento.imagenUrl && <Image source={{ uri: evento.imagenUrl }} style={estilos.imagen} />}
          <Text style={estilos.titulo}>{evento.nombre}</Text>
          <Text>{evento.categoria} · {formatearFecha(evento.fecha)}</Text>
          {evento.fechaFin && evento.fechaFin !== evento.fecha && <Text>Finaliza {formatearFecha(evento.fechaFin)}</Text>}
          <Text>{evento.descripcion}</Text>
          <ComprarEntradas evento={evento} api={api} actualizar={() => setRecarga((valor) => valor + 1)}
            irAMisCompras={irAMisCompras} />
          <Boton title={eventoConResenias === evento.id ? "Ocultar reseñas previas" : "Ver reseñas previas"}
            variante="discreto" expandido={eventoConResenias === evento.id}
            onPress={() => setEventoConResenias((actual) => actual === evento.id ? "" : evento.id)} />
          {eventoConResenias === evento.id && <ReseniasEvento api={api} eventoId={evento.id} />}
        </View>
      ))}
    </View>
  );
};

const estilos = StyleSheet.create({
  titulo: { fontSize: 20, fontWeight: "700", color: colores.texto },
  categorias: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  evento: { backgroundColor: colores.superficie, padding: 16, borderRadius: 16, gap: 8 },
  imagen: { width: "100%", height: 160, borderRadius: 8 },
});
