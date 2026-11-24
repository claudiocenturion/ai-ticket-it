export const enteroPositivo = (texto) => {
  const valor = Number(texto);
  return /^\d+$/.test(texto.trim()) && Number.isSafeInteger(valor) && valor > 0 ? valor : null;
};

export const decimal = (texto) => {
  const limpio = texto.trim();
  const valor = Number(limpio.replace(",", "."));
  return /^\d+(?:[.,]\d+)?$/.test(limpio) && Number.isFinite(valor) ? valor : null;
};

const dosDigitos = (numero) => String(numero).padStart(2, "0");

export const diaLocal = (fecha) => `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
export const horaLocal = (fecha) => `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;

export const combinarFechaHora = ({ dia, hora: horario } = {}) => {
  const partes = `${dia}T${horario}`.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!partes) return null;
  const [anio, mes, numeroDia, hora, minuto] = partes.slice(1).map(Number);
  const fecha = new Date(anio, mes - 1, numeroDia, hora, minuto);
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== numeroDia
    || fecha.getHours() !== hora || fecha.getMinutes() !== minuto) return null;
  return fecha;
};

export const bytesUtf8 = (texto) => [...texto].reduce((total, caracter) => {
  const codigo = caracter.codePointAt(0);
  return total + (codigo <= 0x7f ? 1 : codigo <= 0x7ff ? 2 : codigo <= 0xffff ? 3 : 4);
}, 0);
