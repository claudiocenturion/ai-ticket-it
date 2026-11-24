# AI Ticket It

Aplicación del TP Individual de DDS UTN. Incluye los 12 casos numerados del enunciado. La cobertura está registrada en [casos de uso](docs/casos-de-uso.md).

El [enunciado original](https://chatgpt.com/library?file_id=libfile_6ce1cde12eac8191856741e86e9beaa4&account_id=personal) está disponible como PDF en ese enlace.

## Ejecutar localmente

Requiere Node.js 20.19.4 o superior, npm y un cliente de Expo compatible con el SDK 54.

1. Desde la raíz ejecutá `npm install`.
2. Si todavía no tenés `backend/.env`, copiá `backend/.env.example`. Configurá `CODIGO_ALTA_ORGANIZADOR` si querés permitir el registro de otros organizadores. El backend carga el archivo al arrancar.

   ```powershell
   npm.cmd run dev:backend
   ```

   Comprobá `http://localhost:8000/health` desde la PC.
3. Copiá `mobile/.env.example` a `mobile/.env`. Cambiá la IP de ejemplo por la IPv4 de la PC en la red local. El teléfono y la PC deben estar en la misma red. Desde el teléfono podés comprobar `http://IP-DE-LA-PC:8000/health`.
4. En otra terminal ejecutá `npm run dev:mobile` y abrí el proyecto con el QR generado.
5. Ingresá como organizador con `cine_banfield` o `cine@me.com`. En **Crear evento**, elegí una categoría y seleccioná la fecha y la hora de inicio. El fin es opcional. Cerrá sesión, ingresá como comprador con `claudio` o `claudio@me.com` y buscá el evento por texto o categoría.
6. Elegí un tipo de entrada, ingresá la cantidad y pulsá **Comprar entradas**. El catálogo muestra el resultado y vuelve a consultar el cupo. Una compra registrada queda pendiente de pago.
7. Como **Comprador**, abrí **Mis compras** para ver estados, usar el chat o cancelar una compra elegible. Como **Organizador**, abrí **Ventas** y elegí el evento para ver estados y cupos, responder mensajes y confirmar el pago simulado.
8. Desde el inicio del evento, el organizador puede marcar una compra confirmada como utilizada. Después del fin, el comprador puede reseñarla. La reseña aparece en eventos posteriores del mismo organizador. Usá **Ordenar por** en el catálogo para elegir fecha, precio o puntaje.

Al reiniciar el backend se pierden los eventos y las cuentas creadas durante el uso. El backend vuelve a precargar las dos cuentas iniciales, con nuevos IDs, y cuatro funciones futuras de Cine Banfield. Avengers: Doomsday arranca con una entrada General para la demo de compra.

## Usuarios y sesión

- `POST /api/auth/registro` crea una cuenta por correo y devuelve un JWT. El alta compradora es pública. Si `CODIGO_ALTA_ORGANIZADOR` está ausente, el alta organizadora queda deshabilitada.
- `POST /api/auth/ingreso` recibe `identificador` (usuario o correo) y `clave`. Comprueba la clave con bcrypt. El JWT vence en una hora y se envía como `Authorization: Bearer <token>`.
- `GET /api/auth/yo` devuelve el perfil. La autenticación es stateless. Cada pedido protegido verifica el JWT y obtiene la cuenta por su ID. Al cerrar sesión, el frontend descarta el token. Un JWT emitido puede seguir usándose hasta su vencimiento si la cuenta y el secreto siguen vigentes.
- El backend verifica el JWT, el rol y que el usuario sea propietario o participante del recurso cuando corresponde. El catálogo y las reseñas previas son públicos en la API.
- `JWT_SECRET` permite fijar el secreto de firma. Si se configura, debe tener al menos 32 bytes. Por defecto el backend genera un secreto aleatorio al iniciar.

## Logs del backend

La terminal muestra el arranque y las solicitudes con hora, método, ruta, estado y duración. El identificador de cada solicitud coincide con la cabecera `X-Request-Id`.

```text
[14:25:03] INFO  GET /api/eventos → 200 OK | 2,41 ms | id=…
[14:25:05] WARN  POST /api/eventos → 403 Sin permiso | 1,2 ms | id=…
```

Las consultas exitosas del chat y las solicitudes previas de CORS se registran en nivel `debug`. Sus errores siguen visibles con la configuración predeterminada. En `backend/.env`, usá `AI_TICKET_LOG_LEVEL=debug` para verlas o `AI_TICKET_LOG_FORMAT=json` para obtener logs estructurados.

## Tests

- `npm test` ejecuta las dos suites.
- `npm test -w backend` ejecuta dominio, services y API.
- `npm test -w mobile` ejecuta las pruebas de pantallas.
- Desde `backend/`, `node --test test/dominio/eventos.test.js test/services/eventos.test.js` ejecuta las pruebas que solo requieren Node.

## Recorrido de creación

`CrearEvento.jsx` convierte la fecha local a ISO, arma los tipos de entrada y llama al cliente HTTP. El router aplica el middleware de sesión. El controller llama a `EventosService` y serializa la respuesta. El service valida la entrada con Zod, verifica el rol y la fecha futura, guarda el evento mediante el repositorio y calcula la disponibilidad. `Evento` y `TipoEntrada` protegen sus invariantes. Los middlewares pasan los errores a `next(error)` y el middleware central los convierte en respuestas JSON. La infraestructura HTTP se crea en `app.js` y se pone a escuchar en `server.js`.

En la compra, el controller entrega `req.params.eventoId`, `req.body` y la sesión como argumentos separados. Los services parsean la entrada con Zod antes de aplicar las reglas de negocio. Los repositorios generan el ID de cada evento o compra al guardar el registro en memoria.

