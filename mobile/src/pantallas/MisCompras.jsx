import React from "react";
import { Text, View } from "react-native";
import { Boton } from "../componentes/Boton";
import { DetalleCompra } from "../componentes/DetalleCompra";
import { useConsulta } from "../hooks/useConsulta";

export const MisCompras = ({ api, chatSolicitado }) => {
  const { datos, error, cargando, actualizar } = useConsulta(api.misCompras);
  const compraId = chatSolicitado?.compraId;
  const compras = compraId ? [...(datos ?? [])].sort((a, b) => Number(b.id === compraId) - Number(a.id === compraId)) : datos;
  return (
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header">Mis compras</Text>
      <Boton title="Actualizar compras" variante="discreto" onPress={actualizar} disabled={cargando} />
      {cargando && <Text>Cargando compras…</Text>}
      {error && <Text>{error}</Text>}
      {datos?.length === 0 && <Text>Todavía no tenés compras</Text>}
      {compras?.map((compra) => <DetalleCompra key={compra.id} compra={compra} api={api}
        actualizar={actualizar} abrirChat={compra.id === compraId} />)}
    </View>
  );
};
