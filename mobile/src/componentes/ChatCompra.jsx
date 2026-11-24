import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Boton } from "./Boton";
import { useConsultaPeriodica } from "../hooks/useConsultaPeriodica";
import { ContextoChat } from "../contextoChat";
import { Campo } from "./Campo";
import { formatearFecha } from "../formato";
import { colores } from "../tema";

export const ChatCompra = ({ api, compraId }) => {
  const consultar = useCallback(() => api.mensajes(compraId), [api, compraId]);
  const { datos, error, cargando, actualizar } = useConsultaPeriodica(consultar);
  const contexto = useContext(ContextoChat);
  const registrarChat = contexto?.registrarChat;
  const actualizarAvisos = contexto?.actualizarAvisos;
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const solicitudEnCurso = useRef(false);
  const ultimaLectura = useRef(0);

  useEffect(() => registrarChat?.(compraId), [registrarChat, compraId]);

  useEffect(() => {
    const cantidad = datos?.length ?? 0;
    if (!api.marcarMensajesLeidos || cantidad <= ultimaLectura.current) return;
    ultimaLectura.current = cantidad;
    api.marcarMensajesLeidos(compraId, cantidad).then(() => actualizarAvisos?.()).catch(() => {
      if (ultimaLectura.current === cantidad) ultimaLectura.current = 0;
    });
  }, [api, compraId, datos, actualizarAvisos]);

  const enviar = async () => {
    if (solicitudEnCurso.current || !mensaje.trim()) return;
    solicitudEnCurso.current = true;
    setEnviando(true);
    setErrorEnvio("");
    try {
      await api.enviarMensaje(compraId, mensaje.trim());
      setMensaje("");
      actualizar();
    } catch (fallo) {
      setErrorEnvio(fallo.message);
    } finally {
      solicitudEnCurso.current = false;
      setEnviando(false);
    }
  };

  return (
    <View style={{ gap: 6 }}>
      {cargando && <Text>Cargando mensajes…</Text>}
      {error && <Text accessibilityLiveRegion="polite">{error}. El chat reintentará automáticamente.</Text>}
      {datos?.length === 0 && <Text>Todavía no hay mensajes</Text>}
      {datos?.map(({ usuario, mensaje: texto, enviado }, indice) => (
        <View key={`${enviado}-${indice}`} style={{ backgroundColor: colores.suave, padding: 8, borderRadius: 8 }}>
          <Text>{usuario}: {texto}</Text>
          <Text style={{ color: colores.textoSecundario }}>{formatearFecha(enviado)}</Text>
        </View>
      ))}
      <Campo etiqueta="Mensaje" value={mensaje} onChangeText={setMensaje} editable={!enviando}
        error={mensaje.trim() ? undefined : "Escribí un mensaje."} multiline requerido />
      <Boton title="Enviar mensaje" onPress={enviar} ocupado={enviando} disabled={!mensaje.trim()} />
      {errorEnvio ? <Text accessibilityLiveRegion="polite">{errorEnvio}</Text> : null}
    </View>
  );
};
