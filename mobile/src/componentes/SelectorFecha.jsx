import React, { useState } from "react";
import { Modal, Platform, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colores } from "../tema";
import { Boton } from "./Boton";
import { SelectorFechaMarco } from "./SelectorFechaMarco";
import { diaLocal, horaLocal } from "../validacionesFormulario";

const diaVisible = (dia) => dia.split("-").reverse().join("/");

export const SelectorFecha = ({
  titulo, sufijo, value = {}, onChange, minimo, error, opcional = false, disabled,
}) => {
  const [modo, setModo] = useState(null);
  const [borrador, setBorrador] = useState(null);
  const elegir = (seleccion) => {
    onChange(modo === "date" ? { ...value, dia: diaLocal(seleccion) } : { ...value, hora: horaLocal(seleccion) });
    setModo(null);
  };
  const abrir = (tipo) => {
    const base = minimo ? new Date(`${minimo}T12:00`) : new Date();
    const fecha = new Date(`${value.dia ?? diaLocal(base)}T${value.hora ?? "19:00"}`);
    setBorrador(fecha);
    setModo(tipo);
  };
  const cambiar = (evento, fecha) => {
    if (Platform.OS === "android") {
      if (evento.type === "set" && fecha) elegir(fecha);
      else setModo(null);
    } else if (fecha) {
      setBorrador(fecha);
    }
  };
  const selector = modo && <DateTimePicker testID="selector-nativo" value={borrador} mode={modo}
    display={Platform.OS === "ios" ? "spinner" : "default"} is24Hour onChange={cambiar}
    minimumDate={modo === "date" && minimo ? new Date(`${minimo}T00:00`) : undefined} />;

  return (
    <SelectorFechaMarco titulo={titulo} error={error} opcional={opcional} seleccionado={value.dia || value.hora}
      limpiar={() => onChange(undefined)} disabled={disabled}>
      <View style={estilos.fila}>
        <Boton title={`Elegir fecha de ${sufijo}${value.dia ? ` · ${diaVisible(value.dia)}` : ""}`}
          variante="discreto" disabled={disabled} onPress={() => abrir("date")} />
        <Boton title={`Elegir hora de ${sufijo}${value.hora ? ` · ${value.hora}` : ""}`}
          variante="discreto" disabled={disabled} onPress={() => abrir("time")} />
      </View>
      {Platform.OS === "ios" && modo ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setModo(null)}>
          <View style={estilos.fondo}>
            <View style={estilos.modal} accessibilityViewIsModal>
              <Text accessibilityRole="header" style={estilos.titulo}>Elegir {modo === "date" ? "fecha" : "hora"} de {sufijo}</Text>
              {selector}
              <Boton title="Confirmar selección" onPress={() => elegir(borrador)} />
              <Boton title="Cancelar selección" variante="discreto" onPress={() => setModo(null)} />
            </View>
          </View>
        </Modal>
      ) : selector}
    </SelectorFechaMarco>
  );
};

const estilos = StyleSheet.create({
  fila: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fondo: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#172c2170" },
  modal: { backgroundColor: colores.superficie, borderRadius: 16, padding: 16, gap: 8 },
  titulo: { color: colores.texto, fontWeight: "700", fontSize: 17 },
});
