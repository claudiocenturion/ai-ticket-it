import React, { useCallback } from "react";
import { Text, View } from "react-native";
import { useConsulta } from "../hooks/useConsulta";

export const ReseniasEvento = ({ api, eventoId }) => {
  const consultar = useCallback(() => api.resenias(eventoId), [api, eventoId]);
  const { datos, error, cargando } = useConsulta(consultar);
  return (
    <View style={{ gap: 6 }}>
      {cargando && <Text>Cargando reseñas…</Text>}
      {error && <Text>{error}</Text>}
      {datos?.length === 0 && <Text>El organizador todavía no tiene reseñas previas</Text>}
      {datos?.map(({ id, eventoNombre, compradorNombre, detalle, puntuacion }) => (
        <View key={id}>
          <Text>{eventoNombre} · {puntuacion}/5</Text>
          <Text>{compradorNombre}: {detalle}</Text>
        </View>
      ))}
    </View>
  );
};
