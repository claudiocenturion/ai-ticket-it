import React, { useId, useState } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { colores } from "../tema";

export const Campo = ({ etiqueta, error, ayuda, mostrarError = false, requerido, onBlur, onFocus, multiline, ...props }) => {
  const id = useId();
  const [visitado, setVisitado] = useState(false);
  const [enFoco, setEnFoco] = useState(false);
  const visible = (mostrarError || visitado) && error;
  const descripcion = visible || ayuda;
  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput {...props} multiline={multiline}
        accessibilityLabel={etiqueta}
        accessibilityHint={Platform.OS === "web" ? undefined : descripcion}
        {...(Platform.OS === "web" && {
          "aria-invalid": Boolean(visible), "aria-describedby": descripcion ? id : undefined, "aria-required": requerido,
        })}
        onFocus={(evento) => { setEnFoco(true); onFocus?.(evento); }}
        onBlur={(evento) => { setEnFoco(false); setVisitado(true); onBlur?.(evento); }}
        style={[estilos.entrada, multiline && estilos.multilinea, enFoco && estilos.foco, visible && estilos.invalido]} />
      {descripcion && <Text nativeID={id} accessibilityLiveRegion={visible ? "polite" : "none"}
        style={visible ? estilos.error : estilos.ayuda}>{descripcion}</Text>}
    </View>
  );
};

const estilos = StyleSheet.create({
  campo: { gap: 4, marginBottom: 12 },
  etiqueta: { fontWeight: "700", color: colores.texto },
  entrada: { minHeight: 48, padding: 12, borderWidth: 2, borderColor: colores.borde, borderRadius: 10,
    backgroundColor: colores.superficie, color: colores.texto, fontSize: 16 },
  multilinea: { minHeight: 72, textAlignVertical: "top" },
  foco: { borderColor: colores.primario, backgroundColor: colores.fondo },
  invalido: { borderColor: colores.peligro },
  error: { color: colores.peligro },
  ayuda: { color: colores.textoSecundario },
});
