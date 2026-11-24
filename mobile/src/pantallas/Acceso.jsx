import React, { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Boton } from "../componentes/Boton";
import { Campo } from "../componentes/Campo";
import { colores } from "../tema";
import { bytesUtf8 } from "../validacionesFormulario";

const validar = ({
  email = "", identificador = "", clave = "", nombre = "", apellido = "", codigoOrganizador = "",
}, registro, organizador) => {
  const errores = {};
  if (registro && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errores.email = "Ingresá un correo válido.";
  if (!registro && (!identificador.trim() || identificador.trim().length > 254)) {
    errores.identificador = "Ingresá tu usuario o correo.";
  }
  if (!clave) errores.clave = "Ingresá tu contraseña.";
  else if (registro && clave.length < 8) errores.clave = "Usá al menos 8 caracteres.";
  else if (bytesUtf8(clave) > 72) errores.clave = "La contraseña admite hasta 72 bytes.";
  if (registro) {
    if (!nombre.trim() || nombre.trim().length > 80) errores.nombre = "Ingresá un nombre de hasta 80 caracteres.";
    if (!apellido.trim() || apellido.trim().length > 80) errores.apellido = "Ingresá un apellido de hasta 80 caracteres.";
    if (organizador && (!codigoOrganizador.trim() || codigoOrganizador.length > 256)) {
      errores.codigoOrganizador = "Ingresá el código que te dieron para el alta.";
    }
  }
  return errores;
};

export const Acceso = ({ api, iniciar, aviso }) => {
  const [registro, setRegistro] = useState(false);
  const [organizador, setOrganizador] = useState(false);
  const [datos, setDatos] = useState({});
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [intento, setIntento] = useState(false);
  const [claveVisible, setClaveVisible] = useState(false);
  const enCurso = useRef(false);
  const errores = validar(datos, registro, organizador);

  const campo = (nombre) => ({
    value: datos[nombre] ?? "",
    onChangeText: (valor) => setDatos((actuales) => ({ ...actuales, [nombre]: valor })),
    editable: !enviando,
    error: errores[nombre],
    mostrarError: intento,
    requerido: true,
  });

  const enviar = async () => {
    if (enCurso.current) return;
    setIntento(true);
    setError("");
    if (Object.keys(errores).length) return;
    enCurso.current = true;
    setEnviando(true);
    const { identificador, email, clave, nombre, apellido, codigoOrganizador } = datos;
    try {
      const sesion = registro
        ? await api.registrar({ nombre: nombre.trim(), apellido: apellido.trim(), email: email.trim(), clave,
          rol: organizador ? "ORGANIZADOR" : "COMPRADOR",
          ...(organizador && { codigoOrganizador: codigoOrganizador.trim() }) })
        : await api.ingresar({ identificador: identificador.trim(), clave });
      iniciar(sesion);
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      enCurso.current = false;
      setEnviando(false);
    }
  };

  const cambiarModo = () => {
    setRegistro(!registro);
    setDatos(({ email, identificador }) => ({ email, identificador }));
    setOrganizador(false);
    setError("");
    setIntento(false);
    setClaveVisible(false);
  };

  return (
    <View key={registro ? "registro" : "ingreso"} style={estilos.formulario}>
      <Text accessibilityRole="header" style={estilos.titulo}>{registro ? "Crear una cuenta" : "Iniciar sesión"}</Text>
      {!!aviso && <Text accessibilityLiveRegion="polite">{aviso}</Text>}
      {registro && <>
        <Campo etiqueta="Nombre" {...campo("nombre")} autoComplete="given-name" />
        <Campo etiqueta="Apellido" {...campo("apellido")} autoComplete="family-name" />
      </>}
      {registro
        ? <Campo etiqueta="Correo" {...campo("email")} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        : <Campo etiqueta="Usuario o correo" {...campo("identificador")} autoCapitalize="none" autoComplete="username" />}
      <Campo etiqueta="Contraseña" {...campo("clave")} secureTextEntry={!claveVisible}
        ayuda={registro ? "Usá al menos 8 caracteres." : undefined}
        autoCapitalize="none" autoComplete={registro ? "new-password" : "current-password"} />
      <Boton title={claveVisible ? "Ocultar contraseña" : "Mostrar contraseña"} variante="discreto"
        onPress={() => setClaveVisible(!claveVisible)} />
      {registro && <>
        <Boton title={organizador ? "Registrarme como comprador" : "Registrarme como organizador"} variante="secundario"
          disabled={enviando} onPress={() => setOrganizador(!organizador)} />
        {organizador && <Campo etiqueta="Código de organizador" {...campo("codigoOrganizador")} secureTextEntry autoCapitalize="none" />}
      </>}
      <Boton title={registro ? "Crear cuenta" : "Ingresar"} onPress={enviar} ocupado={enviando} />
      <Boton title={registro ? "Ya tengo cuenta" : "Registrarme"} variante="discreto" onPress={cambiarModo} disabled={enviando} />
      {intento && Object.keys(errores).length > 0 &&
        <Text accessibilityRole="alert" style={estilos.error}>Revisá los campos marcados.</Text>}
      {!!error && <Text accessibilityLiveRegion="polite" style={estilos.error}>{error}</Text>}
    </View>
  );
};

const estilos = StyleSheet.create({
  formulario: { backgroundColor: colores.superficie, borderRadius: 16, padding: 20, gap: 8 },
  titulo: { color: colores.texto, fontSize: 22, fontWeight: "700", marginBottom: 8 },
  error: { color: colores.peligro },
});
