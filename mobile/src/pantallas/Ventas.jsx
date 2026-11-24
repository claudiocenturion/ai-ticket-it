import React, { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Boton } from "../componentes/Boton";
import { DetalleCompra } from "../componentes/DetalleCompra";
import { useConsulta } from "../hooks/useConsulta";

const VentasDeEvento = ({ api, eventoId, compraId }) => {
  const consultar = useCallback(() => api.ventas(eventoId), [api, eventoId]);
  const { datos, error, cargando, actualizar } = useConsulta(consultar);
  const ventas = compraId
    ? [...(datos?.ventas ?? [])].sort((a, b) => Number(b.id === compraId) - Number(a.id === compraId))
    : datos?.ventas;
  return (
    <View style={{ gap: 8 }}>
      <Boton title="Actualizar ventas" variante="discreto" onPress={actualizar} disabled={cargando} />
      {cargando && <Text>Cargando ventas…</Text>}
      {error && <Text>{error}</Text>}
      {datos?.tiposEntrada.map(({ nombre, cupoDisponible, cupo }) =>
        <Text key={nombre}>{nombre}: {cupoDisponible} de {cupo} disponibles</Text>)}
      {datos?.ventas.length === 0 && <Text>Todavía no hay ventas</Text>}
      {ventas?.map((compra) =>
        <DetalleCompra key={compra.id} compra={compra} api={api} organizador actualizar={actualizar}
          abrirChat={compra.id === compraId} />)}
    </View>
  );
};

export const Ventas = ({ api, chatSolicitado }) => {
  const { datos, error, cargando, actualizar } = useConsulta(api.misEventos);
  const [eventoId, setEventoId] = useState(chatSolicitado?.eventoId ?? "");
  useEffect(() => {
    if (chatSolicitado?.eventoId) setEventoId(chatSolicitado.eventoId);
  }, [chatSolicitado]);
  const eventos = chatSolicitado
    ? [...(datos ?? [])].sort((a, b) => Number(b.id === chatSolicitado.eventoId) - Number(a.id === chatSolicitado.eventoId))
    : datos;
  return (
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header">Ventas de mis eventos</Text>
      <Boton title="Actualizar eventos" variante="discreto" onPress={actualizar} disabled={cargando} />
      {cargando && <Text>Cargando tus eventos…</Text>}
      {error && <Text>{error}</Text>}
      {datos?.length === 0 && <Text>Todavía no publicaste eventos</Text>}
      {eventos?.map(({ id, nombre }) => (
        <View key={id} style={{ gap: 8 }}>
          <Boton title={id === eventoId ? `Ocultar ventas de ${nombre}` : `Ver ventas de ${nombre}`}
            variante="secundario" expandido={id === eventoId}
            onPress={() => setEventoId(id === eventoId ? "" : id)} />
          {id === eventoId && <VentasDeEvento api={api} eventoId={id}
            compraId={id === chatSolicitado?.eventoId ? chatSolicitado.compraId : undefined} />}
        </View>
      ))}
    </View>
  );
};
