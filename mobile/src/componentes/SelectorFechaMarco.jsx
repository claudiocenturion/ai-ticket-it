import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colores } from "../tema";
import { Boton } from "./Boton";

export const SelectorFechaMarco = ({ titulo, descripcionId, error, opcional, seleccionado, limpiar, disabled, children }) => (
  <View style={estilos.grupo}>
    <Text style={estilos.titulo}>{titulo}{opcional ? " (opcional)" : ""}</Text>
    {children}
    {error && <Text nativeID={descripcionId} accessibilityLiveRegion="polite" style={estilos.error}>{error}</Text>}
    {opcional && seleccionado && <Boton title="Quitar fin del evento" variante="discreto" disabled={disabled} onPress={limpiar} />}
  </View>
);

const estilos = StyleSheet.create({
  grupo: { gap: 8, backgroundColor: colores.fondo, padding: 12, borderRadius: 12 },
  titulo: { color: colores.texto, fontWeight: "700", fontSize: 16 },
  error: { color: colores.peligro },
});
