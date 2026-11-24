import React, { useId } from "react";
import { colores } from "../tema";
import { SelectorFechaMarco } from "./SelectorFechaMarco";

const estiloCampo = {
  color: colores.texto, backgroundColor: colores.superficie, borderColor: colores.borde,
  borderStyle: "solid", borderWidth: 2, borderRadius: 10, minHeight: 48,
  padding: "0 12px", fontFamily: "inherit", fontSize: 16, boxSizing: "border-box",
};

export const SelectorFecha = ({
  titulo, sufijo, value = {}, onChange, minimo, error, opcional = false, disabled,
}) => {
  const descripcionId = useId();
  const campos = [
    { clave: "dia", tipo: "date", etiqueta: `Fecha de ${sufijo}`, min: minimo },
    { clave: "hora", tipo: "time", etiqueta: `Hora de ${sufijo}` },
  ];
  return (
    <SelectorFechaMarco titulo={titulo} descripcionId={descripcionId} error={error} opcional={opcional}
      seleccionado={value.dia || value.hora} limpiar={() => onChange(undefined)} disabled={disabled}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {campos.map(({ clave, tipo, etiqueta, min }) => (
          <label key={clave} style={{ display: "grid", gap: 4, color: colores.texto, fontWeight: 600 }}>
            {etiqueta}
            <input type={tipo} value={value[clave] ?? ""} min={min} disabled={disabled}
              aria-describedby={error ? descripcionId : undefined} aria-invalid={Boolean(error)}
              required={!opcional} style={estiloCampo}
              onChange={(evento) => onChange({ ...value, [clave]: evento.target.value })} />
          </label>
        ))}
      </div>
    </SelectorFechaMarco>
  );
};
