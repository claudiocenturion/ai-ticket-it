import React, { useRef, useState } from "react";
import { Text, View } from "react-native";
import { Boton } from "./Boton";
import { Campo } from "./Campo";
import { formatearPrecio } from "../formato";
import { enteroPositivo } from "../validacionesFormulario";

export const ComprarEntradas = ({ evento, api, actualizar, irAMisCompras }) => {
  const [tipoEntrada, setTipoEntrada] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [compraRegistrada, setCompraRegistrada] = useState(false);
  const [intento, setIntento] = useState(false);
  const solicitudEnCurso = useRef(false);
  const tipo = evento.tiposEntrada.find(({ nombre }) => nombre === tipoEntrada);
  const ventaCerrada = Date.parse(evento.fecha) <= Date.now();
  const unidades = enteroPositivo(cantidad);
  const errorCantidad = unidades === null ? "La cantidad debe ser un entero positivo"
    : tipo && unidades > tipo.cupoDisponible && tipo.cupoDisponible > 0 ? "Cupo insuficiente" : undefined;

  const comprar = async () => {
    if (solicitudEnCurso.current || !tipo || ventaCerrada || tipo.cupoDisponible === 0) return;
    setIntento(true);
    if (errorCantidad) return;

    solicitudEnCurso.current = true;
    setEnviando(true);
    setMensaje("");
    try {
      const compra = await api.comprar(evento.id, { tipoEntrada, cantidad: unidades });
      setMensaje(`Compra registrada por ${compra.cantidad} entrada(s). Pendiente de pago.`);
      setCompraRegistrada(true);
      setTipoEntrada("");
      setCantidad("1");
      actualizar();
    } catch (error) {
      setMensaje(error.message);
      if (error.estado === 409) actualizar();
    } finally {
      solicitudEnCurso.current = false;
      setEnviando(false);
    }
  };

  return (
    <View style={{ gap: 8 }}>
      {ventaCerrada && <Text>Venta cerrada</Text>}
      {evento.tiposEntrada.map(({ nombre, precio, cupoDisponible }) => (
        <View key={nombre}>
          <Text>{nombre} · {formatearPrecio(precio)} · {cupoDisponible === 0 ? "Agotado" : `${cupoDisponible} lugares`}</Text>
          <Boton title={tipoEntrada === nombre ? `${nombre} seleccionado` : `Elegir ${nombre}`}
            variante="secundario" seleccionado={tipoEntrada === nombre}
            disabled={enviando || ventaCerrada || cupoDisponible === 0}
            onPress={() => { setTipoEntrada(nombre); setMensaje(""); setCompraRegistrada(false); setIntento(false); }} />
        </View>
      ))}
      {tipo && !ventaCerrada && (
        <>
          <Campo etiqueta="Cantidad" value={cantidad} onChangeText={setCantidad}
            keyboardType="number-pad" editable={!enviando} error={errorCantidad} mostrarError={intento} requerido />
          {unidades !== null && unidades <= tipo.cupoDisponible && Number.isFinite(tipo.precio * unidades)
            && <Text>Total: {formatearPrecio(tipo.precio * unidades)}</Text>}
          <Boton title="Comprar entradas" onPress={comprar} ocupado={enviando} disabled={tipo.cupoDisponible === 0} />
        </>
      )}
      {mensaje !== "" && <Text accessibilityLiveRegion="polite">{mensaje}</Text>}
      {compraRegistrada && irAMisCompras && <Boton title="Ir a mis compras" variante="secundario" onPress={irAMisCompras} />}
    </View>
  );
};
