import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { Boton } from "./componentes/Boton";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { acceso, crearApi } from "./api";
import { Catalogo } from "./pantallas/Catalogo";
import { CrearEvento } from "./pantallas/CrearEvento";
import { MisCompras } from "./pantallas/MisCompras";
import { Ventas } from "./pantallas/Ventas";
import { Acceso } from "./pantallas/Acceso";
import { colores } from "./tema";
import { ContextoChat } from "./contextoChat";
import { useConsultaPeriodica } from "./hooks/useConsultaPeriodica";

const navegacion = {
  comprador: [
    { id: "catalogo", etiqueta: "Catálogo", Componente: Catalogo },
    { id: "compras", etiqueta: "Mis compras", Componente: MisCompras },
  ],
  organizador: [
    { id: "crear", etiqueta: "Crear evento", Componente: CrearEvento },
    { id: "ventas", etiqueta: "Ventas", Componente: Ventas },
  ],
};

const AreaSesion = ({ sesion, terminar }) => {
  const { usuario, token } = sesion;
  const rol = usuario.rol.toLowerCase();
  const opciones = navegacion[rol];
  const [pantalla, setPantalla] = useState(opciones[0].id);
  const [chatSolicitado, setChatSolicitado] = useState(null);
  const [chatsActivos, setChatsActivos] = useState(() => new Set());
  const api = useMemo(() => crearApi(token, () => terminar(token, "Tu sesión venció. Volvé a ingresar.")), [token, terminar]);
  const { Componente } = opciones.find(({ id }) => id === pantalla);
  const { datos: notificaciones, actualizar: actualizarAvisos } = useConsultaPeriodica(api.notificacionesMensajes);
  const notificacion = notificaciones?.find(({ compraId }) => !chatsActivos.has(compraId));
  const registrarChat = useCallback((compraId) => {
    setChatsActivos((actuales) => new Set([...actuales, compraId]));
    return () => setChatsActivos((actuales) => {
      const siguientes = new Set(actuales);
      siguientes.delete(compraId);
      return siguientes;
    });
  }, []);
  const contextoChat = useMemo(() => ({ registrarChat, actualizarAvisos }), [registrarChat, actualizarAvisos]);

  const navegar = (destino) => {
    setChatSolicitado(null);
    setPantalla(destino);
  };

  const abrirNotificacion = () => {
    setChatSolicitado({ compraId: notificacion.compraId, eventoId: notificacion.eventoId });
    setPantalla(rol === "comprador" ? "compras" : "ventas");
  };

  return (
    <ContextoChat.Provider value={contextoChat}>
      <View style={estilos.encabezado}>
        <Text accessibilityRole="header" style={estilos.marca}>AI Ticket It</Text>
        <View style={estilos.perfil}>
          <Text style={estilos.nombre}>{usuario.nombre} {usuario.apellido} · {rol}</Text>
          <Boton title="Cerrar sesión" variante="discreto" onPress={() => terminar(token)} />
        </View>
        <View accessibilityRole="tablist" style={estilos.roles}>
          {opciones.map(({ id, etiqueta }) => (
            <Boton key={id} title={etiqueta} accessibilityRole="tab" seleccionado={pantalla === id}
              variante={pantalla === id ? "principal" : "secundario"} style={estilos.opcion}
              onPress={() => navegar(id)} />
          ))}
        </View>
      </View>
      {notificacion && <View style={estilos.notificacion}>
        <Text accessibilityLiveRegion="polite" style={estilos.nombre}>{
          notificacion.cantidad === 1 ? "Mensaje nuevo" : `${notificacion.cantidad} mensajes nuevos`
        } · {notificacion.eventoNombre}</Text>
        <Text numberOfLines={2} style={estilos.vistaPrevia}>{notificacion.ultimo.usuario}: {notificacion.ultimo.mensaje}</Text>
        <Boton title="Abrir conversación" variante="secundario" onPress={abrirNotificacion} />
      </View>}
      <ScrollView key={`${pantalla}:${chatSolicitado?.compraId ?? ""}`} contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Componente api={api} chatSolicitado={chatSolicitado}
          irAMisCompras={rol === "comprador" ? () => navegar("compras") : undefined}
          irAVentas={rol === "organizador" ? () => navegar("ventas") : undefined} />
      </ScrollView>
    </ContextoChat.Provider>
  );
};

const App = () => {
  const [estado, setEstado] = useState({ sesion: null, aviso: "" });
  const terminar = useCallback((token, aviso = "") => {
    setEstado((actual) => actual.sesion?.token === token ? { sesion: null, aviso } : actual);
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={estilos.pantalla}>
        <StatusBar barStyle="dark-content" />
        {estado.sesion ? <AreaSesion sesion={estado.sesion} terminar={terminar} /> : (
          <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            <Text accessibilityRole="header" style={estilos.marca}>AI Ticket It</Text>
            <Acceso api={acceso} aviso={estado.aviso} iniciar={(sesion) => setEstado({ sesion, aviso: "" })} />
          </ScrollView>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  encabezado: { backgroundColor: colores.superficie, paddingHorizontal: 20, paddingVertical: 12, gap: 10,
    borderBottomWidth: 1, borderBottomColor: colores.separador },
  contenido: { padding: 20, paddingBottom: 36, gap: 18 },
  marca: { color: colores.primario, fontWeight: "800", fontSize: 30 },
  roles: { flexDirection: "row", gap: 8 },
  perfil: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  nombre: { color: colores.texto, fontWeight: "600" },
  opcion: { flex: 1 },
  notificacion: { backgroundColor: colores.suave, padding: 12, margin: 12, gap: 6, borderRadius: 12,
    borderWidth: 1, borderColor: colores.borde },
  vistaPrevia: { color: colores.textoSecundario },
});

export default App;
