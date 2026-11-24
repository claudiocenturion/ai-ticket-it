# Casos de uso de AI Ticket It

Los identificadores siguen el orden de la página 8 del [enunciado](https://chatgpt.com/library?file_id=libfile_6ce1cde12eac8191856741e86e9beaa4&account_id=personal).

| ID | Actor y acción | Regla y criterio de aceptación | Escenario automatizado |
| --- | --- | --- | --- |
| CU01 | Comprador consulta sus compras | Ve solo las propias. Cada una muestra su estado y las confirmadas muestran los días restantes. | Pasaron API y pantalla. Se verificaron propiedad, estados y días con reloj fijo. |
| CU02 | Organizador consulta las ventas de su evento | Solo puede consultar eventos propios. Ve estados y cupos restantes por tipo. | Pasaron API y pantalla. Se verificaron cupos, estados y rechazo del acceso a un evento ajeno. |
| CU03 | Comprador busca por texto y explora categorías | Los filtros se combinan. Las categorías predefinidas están disponibles incluso sin eventos. El texto busca en nombre y descripción. | Pasaron validación Zod, service, API y pantalla. Se verificaron filtros combinados, filtros repetidos y selección de categoría con el catálogo vacío. |
| CU04 | Organizador crea un evento con distintos tipos de entrada | Se exige sesión de organizador, una categoría del catálogo, fecha futura y al menos un tipo con nombre único, precio no negativo y cupo entero positivo. | Pasaron validación Zod, dominio, service, API y pantalla. Se verificó que la API rechaza categorías desconocidas y que el formulario envía las fechas seleccionadas en UTC. |
| CU05 | Comprador envía un mensaje dentro de su compra | Solo los participantes acceden al chat. El estado de la compra no impide enviarlo. El destinatario recibe un aviso dentro de la app. | Pasaron API y pantalla. El comprador escribe tras cancelar, se rechaza el acceso ajeno y se verifica la apertura desde el aviso. |
| CU06 | Organizador responde dentro de la compra | Puede escribir solo en compras de eventos propios y en cualquier estado. El chat abierto consulta los mensajes automáticamente. | Pasaron API y pantalla. Se verificaron la actualización sin interacción, la apertura desde el aviso y las lecturas concurrentes. |
| CU07 | Comprador cancela su compra y obtiene reembolso | Si hubo pago, se registra el reembolso simulado. El cupo se devuelve como máximo una vez. | Pasaron API y pantalla. Se verificaron cancelación pendiente, reembolso de pagada, solicitudes repetidas y reutilización del cupo liberado. |
| CU08 | Organizador requiere límites de cancelación | Una compra utilizada o de un evento ya realizado no se puede cancelar. | Pasaron API y pantalla. La API rechaza compras utilizadas, ajenas y posteriores al evento. La pantalla oculta la acción cuando no se permite. |
| CU09 | Comprador puntúa y comenta | Se exige compra propia utilizada y evento finalizado. | Pasaron API y pantalla. Se verificaron elegibilidad, rango, duplicados y publicación. |
| CU10 | Comprador ve reseñas previas del organizador | En el catálogo se muestran las reseñas de eventos anteriores del mismo organizador. | Pasaron API y pantalla. Se verificaron inclusión y exclusión por organizador y evento. |
| CU11 | Comprador ordena el catálogo | Puede ordenar por precio, fecha y puntaje del organizador. | Pasaron API y pantalla. Los tres órdenes se probaron con resultados diferentes. |
| CU12 | Comprador compra un tipo de entrada y una cantidad | La cantidad es entera positiva y no supera el cupo restante del tipo. La compra queda pendiente de pago y reserva las entradas. | Pasaron 10 pruebas de validación Zod, dominio, service, API y pantalla. Cubren compra válida, cantidad inválida, cupo insuficiente y dos pedidos por el último lugar. La API devolvió un 201 y un 409 y el cupo quedó en cero. La prueba de pantalla simuló ambos resultados. |

## Ejecución del 23/11/2026

- `npm test -w backend` pasó 39 pruebas y Node también reportó la carga exitosa de `test/fixture.js`. Las pruebas usaron Express en localhost y cubrieron los 12 casos con cuentas autenticadas. También verificaron las cuentas y las funciones iniciales, la validación del JWT por otra instancia, CORS, los logs y el arranque con un puerto ocupado.
- Las pruebas de CU03, CU04 y CU12 verificaron que, al invocar los services directamente con datos inválidos, el service valida la entrada con Zod y la aplicación genera un `ErrorValidacion`. Las pruebas HTTP comprobaron que esos errores llegan como respuestas JSON con estado 400.
- CU04 y CU12 verificaron que los IDs enviados en el body se descartan y que los repositorios devuelven IDs generados al guardar. CU12 verificó también que el evento se toma de los parámetros de ruta.
- Una prueba de dominio verificó las relaciones entre evento, organizador, categoría, compra, comprador, tipo de entrada, mensaje, reseña y cambio de estado según el diagrama de la página 5.
- `npm test -w mobile` pasó 19 pruebas en 4 suites. Se verificaron la navegación por rol, la sesión, las validaciones locales, la selección de categoría, fecha y hora y los avisos automáticos para los dos roles. Las pruebas simularon el selector nativo y el transporte HTTP de la app.

## Decisiones

- El rol se asigna al registrar la cuenta. El alta de organizadores requiere el código configurado en el backend. Las contraseñas se guardan con bcrypt. El JWT vence en una hora. El cierre de sesión descarta el token en el frontend y la autenticación del backend es stateless. El catálogo es público en la API.
- El backend precarga las categorías en memoria. La app usa sus nombres en creación y búsqueda. Los selectores trabajan en hora local del dispositivo y la app convierte las fechas a ISO UTC. Se admite una imagen opcional mediante URL.
- El cupo se calcula a partir de compras pendientes, confirmadas y utilizadas. La verificación y el registro son síncronos. La venta y la cancelación cierran al inicio del evento. Cancelar una compra confirmada registra un reembolso simulado y libera el cupo.
- Una compra empieza en `PENDIENTE`. El organizador de demostración puede confirmar el pago simulado y registrar el uso desde el inicio. Los cambios quedan registrados en memoria. El fin del evento es opcional. Si se omite, coincide con el inicio.
- Cada comprador puede publicar una reseña por evento después del fin y con una compra utilizada. El puntaje va de 1 a 5. El orden por precio usa el tipo más barato, el de fecha es cronológico ascendente y el de puntaje usa el promedio de reseñas de eventos previos, de mayor a menor. Los eventos sin reseñas quedan al final en ese orden.
- Con la app activa, el chat y los avisos consultan la API cada 3 segundos. Al volver del segundo plano se reanuda la consulta. La posición de lectura se guarda por participante en memoria. Los avisos aparecen dentro de la app.
- Favoritos sigue pendiente como funcionalidad del contexto general de la página 4.

