import { useCallback, useEffect, useState } from "react";

export const useConsulta = (consultar) => {
  const [resultado, setResultado] = useState({ cargando: Boolean(consultar) });
  const [version, setVersion] = useState(0);
  const actualizar = useCallback(() => setVersion((anterior) => anterior + 1), []);

  useEffect(() => {
    if (!consultar) return;
    let vigente = true;
    setResultado((anterior) => anterior.consultar === consultar
      ? { ...anterior, cargando: true, error: undefined }
      : { consultar, cargando: true });
    consultar().then((datos) => {
      if (vigente) setResultado({ consultar, datos });
    }).catch((error) => {
      if (vigente) setResultado({ consultar, error: error.message });
    });
    return () => { vigente = false; };
  }, [consultar, version]);

  return { ...(resultado.consultar === consultar ? resultado : { cargando: Boolean(consultar) }), actualizar };
};
