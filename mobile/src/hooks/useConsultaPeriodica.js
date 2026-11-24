import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

export const intervaloChat = 3000;

export const useConsultaPeriodica = (consultar, intervalo = intervaloChat) => {
  const [resultado, setResultado] = useState({ cargando: true });
  const solicitarAhora = useRef(null);
  const actualizar = useCallback(() => solicitarAhora.current?.(), []);

  useEffect(() => {
    let vigente = true;
    let activa = !["background", "inactive"].includes(AppState.currentState);
    let temporizador;
    let enCurso = false;
    let pendiente = false;
    setResultado({ cargando: true });

    const consultarAhora = async () => {
      clearTimeout(temporizador);
      if (!vigente || !activa) return;
      if (enCurso) {
        pendiente = true;
        return;
      }
      enCurso = true;
      try {
        const datos = await consultar();
        if (vigente && activa) setResultado({ datos, cargando: false });
      } catch (error) {
        if (vigente && activa) setResultado((anterior) => ({ ...anterior, cargando: false, error: error.message }));
      } finally {
        enCurso = false;
        if (vigente && activa) {
          if (pendiente) {
            pendiente = false;
            consultarAhora();
          } else {
            temporizador = setTimeout(consultarAhora, intervalo);
          }
        }
      }
    };

    solicitarAhora.current = consultarAhora;
    consultarAhora();
    const suscripcion = AppState.addEventListener("change", (estado) => {
      activa = estado === "active";
      if (activa) consultarAhora();
      else clearTimeout(temporizador);
    });
    return () => {
      vigente = false;
      solicitarAhora.current = null;
      clearTimeout(temporizador);
      suscripcion.remove();
    };
  }, [consultar, intervalo]);

  return { ...resultado, actualizar };
};
