import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Boton } from "./Boton";
import { Campo } from "./Campo";
import { ChatCompra } from "./ChatCompra";
import { formatearFecha, formatearPrecio } from "../formato";
import { colores } from "../tema";
import { decimal } from "../validacionesFormulario";

const estados = {
  PENDIENTE: "Pendiente de pago", CONFIRMADA: "Confirmada", UTILIZADA: "Utilizada",
  CANCELADA: "Cancelada", REEMBOLSADA: "Reembolsada",
};

export const DetalleCompra = ({ compra, api, organizador = false, actualizar, abrirChat = false }) => {
  const [chat, setChat] = useState(abrirChat);
  useEffect(() => {
    if (abrirChat) setChat(true);
  }, [abrirChat]);
  const [confirmarCancelacion, setConfirmarCancelacion] = useState(false);
  const [detalle, setDetalle] = useState("");
  const [puntaje, setPuntaje] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [intentoResenia, setIntentoResenia] = useState(false);
  const operacionEnCurso = useRef(false);
  const puntuacion = decimal(puntaje);
  const errorPuntaje = puntuacion === null || puntuacion < 1 || puntuacion > 5 ? "Ingresá un puntaje entre 1 y 5." : undefined;
  const errorDetalle = detalle.trim() ? undefined : "Escribí un comentario.";

  const ejecutar = async (operacion, confirmacion) => {
    if (operacionEnCurso.current) return;
    operacionEnCurso.current = true;
    setOcupado(true);
    setMensaje("");
    try {
      const resultado = await operacion();
      setConfirmarCancelacion(false);
      setMensaje(typeof confirmacion === "function" ? confirmacion(resultado) : confirmacion);
      actualizar();
    } catch (error) {
      setMensaje(error.message);
    } finally {
      operacionEnCurso.current = false;
      setOcupado(false);
    }
  };

  const publicarResenia = () => {
    setIntentoResenia(true);
    if (errorPuntaje || errorDetalle) return;
    ejecutar(() => api.reseniar(compra.id, { detalle: detalle.trim(), puntuacion }), "Reseña publicada");
  };

  return (
    <View style={estilos.tarjeta}>
      <Text accessibilityRole="header" style={estilos.titulo}>{organizador ? compra.compradorNombre : compra.eventoNombre}</Text>
      {compra.eventoFecha && !organizador && <Text>{formatearFecha(compra.eventoFecha)}</Text>}
      <Text>{compra.tipoEntrada} · {compra.cantidad} entrada(s)</Text>
      {Number.isFinite(compra.total) && <Text>Total: {formatearPrecio(compra.total)}</Text>}
      <Text style={estilos.estado}>{estados[compra.estado] ?? compra.estado}</Text>
      {compra.diasRestantes != null && (
        <Text>{compra.diasRestantes} {compra.diasRestantes === 1 ? "día" : "días"} para el evento</Text>
      )}
      <Boton title={chat ? "Cerrar chat" : "Abrir chat"} variante="secundario" expandido={chat} onPress={() => setChat(!chat)} />
      {chat && <ChatCompra api={api} compraId={compra.id} />}
      {compra.puedeConfirmar && <Boton title="Confirmar pago simulado" disabled={ocupado}
        onPress={() => ejecutar(() => api.cambiarEstado(compra.id, "CONFIRMADA"), "Pago confirmado")} />}
      {compra.puedeMarcarUtilizada && <Boton title="Marcar como utilizada" disabled={ocupado}
        onPress={() => ejecutar(() => api.cambiarEstado(compra.id, "UTILIZADA"), "Entrada marcada como utilizada")} />}
      {compra.puedeCancelar && (
        confirmarCancelacion
          ? <View style={{ gap: 6 }}>
            <Text>{compra.estado === "CONFIRMADA"
              ? "Se cancelará tu entrada y se registrará un reembolso simulado."
              : "Se cancelará tu compra y se liberarán las entradas."}</Text>
            <Boton title="Confirmar cancelación" variante="peligro" ocupado={ocupado}
              onPress={() => ejecutar(() => api.cancelar(compra.id), (resultado) =>
                resultado?.estado === "REEMBOLSADA" ? "Reembolso simulado registrado" : "Cancelación registrada")} />
            <Boton title="Volver" variante="discreto" onPress={() => setConfirmarCancelacion(false)} disabled={ocupado} />
          </View>
          : <Boton title="Cancelar compra" variante="peligro" onPress={() => setConfirmarCancelacion(true)} disabled={ocupado} />
      )}
      {compra.puedeReseniar && <View style={{ gap: 6 }}>
        <Campo etiqueta="Puntaje de 1 a 5" keyboardType="decimal-pad" value={puntaje} onChangeText={setPuntaje}
          error={errorPuntaje} mostrarError={intentoResenia} editable={!ocupado} requerido />
        <Campo etiqueta="Comentario" value={detalle} onChangeText={setDetalle} multiline
          error={errorDetalle} mostrarError={intentoResenia} editable={!ocupado} requerido />
        <Boton title="Publicar reseña" ocupado={ocupado} onPress={publicarResenia} />
      </View>}
      {mensaje ? <Text accessibilityLiveRegion="polite">{mensaje}</Text> : null}
    </View>
  );
};

const estilos = StyleSheet.create({
  tarjeta: { backgroundColor: colores.superficie, padding: 16, gap: 8, borderRadius: 16 },
  titulo: { color: colores.texto, fontWeight: "700", fontSize: 17 },
  estado: { alignSelf: "flex-start", backgroundColor: colores.suave, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, fontWeight: "600", color: colores.primario },
});
