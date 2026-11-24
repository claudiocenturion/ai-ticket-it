import React, { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from "react-native";
import { colores } from "../tema";

export const Boton = ({
  title, onPress, disabled = false, ocupado = false, variante = "principal",
  accessibilityRole = "button", seleccionado, expandido, style,
}) => {
  const [enFoco, setEnFoco] = useState(false);
  const bloqueado = disabled || ocupado;
  const principal = variante === "principal";
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={title}
      accessibilityState={{ disabled: bloqueado, busy: ocupado, selected: seleccionado, expanded: expandido }}
      {...(Platform.OS === "web" && {
        "aria-disabled": bloqueado, "aria-busy": ocupado, "aria-expanded": expandido,
        "aria-selected": accessibilityRole === "tab" ? seleccionado : undefined,
        "aria-pressed": accessibilityRole === "button" ? seleccionado : undefined,
      })}
      disabled={bloqueado}
      onPress={onPress}
      onFocus={() => setEnFoco(true)}
      onBlur={() => setEnFoco(false)}
      style={({ pressed }) => [
        estilos.boton, estilos[variante], pressed && (principal ? estilos.principalPresionado : estilos.presionado), style,
        bloqueado && estilos.bloqueado, enFoco && estilos.foco,
      ]}
    >
      {ocupado && <ActivityIndicator accessible={false} color={colores.textoSecundario} />}
      <Text style={[
        estilos.texto, principal && estilos.textoPrincipal,
        variante === "peligro" && estilos.textoPeligro, bloqueado && estilos.textoBloqueado,
      ]}>{title}</Text>
    </Pressable>
  );
};

const estilos = StyleSheet.create({
  boton: {
    minHeight: 48, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 2,
    alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8,
  },
  principal: { backgroundColor: colores.primario, borderColor: colores.primario },
  secundario: { backgroundColor: colores.suave, borderColor: colores.separador },
  discreto: { backgroundColor: colores.superficie, borderColor: colores.borde },
  peligro: { backgroundColor: colores.peligroSuave, borderColor: colores.peligro },
  presionado: { opacity: 0.84 },
  principalPresionado: { backgroundColor: colores.presionado, borderColor: colores.presionado },
  bloqueado: { backgroundColor: colores.deshabilitado, borderColor: colores.separador },
  foco: { borderColor: colores.texto, borderStyle: "dashed" },
  texto: { color: colores.primario, fontSize: 15, fontWeight: "700", textAlign: "center", flexShrink: 1 },
  textoPrincipal: { color: colores.superficie },
  textoPeligro: { color: colores.peligro },
  textoBloqueado: { color: colores.textoSecundario },
});
