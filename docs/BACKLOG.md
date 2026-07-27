# DonAR — Backlog

Backlog vivo del producto. Ordena lo que hay que hacer por épicas y dependencia. No es el estado del código (eso vive en `memory.md`); acá vive el "qué falta y en qué orden".

Última actualización: 27 de julio de 2026.

**Estados:** ✅ hecho · 🔨 en curso · ⬜ pendiente · 🐞 bug · 🅿️ parqueado (fuera del MVP por ahora) · ❓ decisión abierta

---

## Épica 1 — Panel de "mi causa" (vista del creador)
*Base de casi todo lo demás: es donde el creador vive su causa y donde después confirma transferencias y ve el cierre.*

- ✅ **1.1** Ver mi causa: el detalle de una causa propia ya publicada muestra recaudado/meta, días restantes y aportes recibidos, con botón "Compartir mi causa" en vez de "Donar" (ya no te ofrece donar a vos mismo). En `cause/[id].tsx`, branch `isOwner`.
- ✅ **1.2** Estado del trámite visible desde el Perfil: sección "Mis causas" con pill de estado (En revisión / Publicada / Rechazada / Cumplida).
- ✅ **1.3** "Mis causas" accesible desde el Perfil: cada fila lleva al detalle/panel de esa causa.

## Épica 2 — Métodos de pago del donante
- ✅ **2.1** Mercado Pago (checkout sandbox). *Nota: es demo custodial — cobra a una sola cuenta, no va al beneficiado. On-axis solo con split de pagos (ver Parqueado).*
- ✅ **2.2** Bifurcación en la pantalla de donar: "Pagar con Mercado Pago" o "Transferir yo mismo".
- ✅ **2.3** Flujo de transferencia (`transfer/[id].tsx`): muestra el alias del beneficiado (copiable), el donante sube el comprobante, el aporte entra `pending` (no cuenta para la meta hasta confirmarse). Bucket privado `transfer-receipts`. En la lista de aportes se tagea "por confirmar".

## Épica 3 — Confirmación del aporte por transferencia
*El eslabón de confianza del modelo sin custodia. Ver el modelo completo en el paper, sección "Confianza del dinero sin custodia".*

- ✅ **3.1** El beneficiado ve, en el panel de su causa, las transferencias pendientes con el comprobante (URL firmada; RLS de dueño).
- ✅ **3.2** Confirma ("Me llegó") o rechaza ("No me llegó") cada una. Al confirmar, el aporte pasa a `approved` → suma a la meta y cuenta para los puntos automáticamente (todo se calcula de los `approved`). Rechazar → `rejected`, no cuenta.
- ❓ **3.3** Qué pasa si el beneficiado no confirma nunca (¿timeout? ¿el donante puede reclamar?). SIGUE ABIERTA.
- ⬜ **3.4** Kudos/aviso al donante cuando le confirman el aporte (hoy no hay notificaciones; va con la tab Actividad, TBD).

## Épica 4 — Cierre de causa + agradecimiento
*Se dispara por tiempo (venció el plazo) o por monto (llegó a la meta).*

- ⬜ **4.1** El creador ve el estado de cierre: "cumplida" (happy) o "cerrada sin llegar" (unhappy).
- ⬜ **4.2** Mini-reporte de cierre: cuánto se juntó, cuántas personas, en cuánto tiempo.
- ⬜ **4.3** Flujo de agradecimiento: el beneficiado deja un mensaje de cierre y puede agradecer a los donantes (o a alguien puntual).
- ❓ **4.4** Destino del excedente si superó la meta (pendiente + legal).

## Épica 5 — Puntos / ranking coherentes con la regla
- ⬜ **5.1** Puntos y meta cuentan **solo aportes confirmados** (MP = instantáneo; transferencia = al confirmar). Hoy cuenta todo lo `approved`.
- 🅿️ **5.2** Racha semanal (x1,2) en la fórmula de puntos.
- 🅿️ **5.3** +200 por verificar identidad (no aplica a donantes en el flujo actual).

## Épica 6 — Reglas de creación de causa
- ⬜ **6.1** Monto mínimo para pedir (que no se pueda crear una causa pidiendo $1). Define un piso razonable para el MVP.
- ⬜ **6.2** Revisar máximos / coherencia monto vs. evidencia (ya lo mira el curador, ver si sumar validación blanda).

---

## Bugs / known issues
- ✅ **La foto de portada no se ve.** Resuelto: el view `causes_public` con `select c.*` no exponía columnas agregadas después; se recreó el view.
- 🐞 **El swipe nativo de iOS para volver atrás (y adelante) no funciona.** Las pantallas del flujo (create/cobro/review/donate/transfer/cause) son `Tabs.Screen` con `href:null`, no un stack, así que no hay gesto de navegación nativo. Evaluar mover el flujo a un Stack o habilitar el gesto. Reportado 27 jul.
- 🐞 **El carrusel de fotos no se puede swipear desde el feed.** En la `cause-card` la tarjeta está envuelta en un `Pressable` (para abrir el detalle) que probablemente intercepta el gesto horizontal del carrusel. Reportado 27 jul.

---

## Decisiones abiertas (producto, no código)
- ❓ **Modelo de confianza de la transferencia.** Recomendado: el beneficiado confirma, comprobante público, solo lo confirmado suma. Falta OK final. (Analizado en el paper.)
- ❓ **Qué hacemos con Mercado Pago:** ¿queda como "demo / próximamente" hasta tener split de pagos, o se muestra igual sabiendo que es custodial?
- ❓ **Timeout de confirmación** de transferencia (Épica 3.3).
- ❓ **Destino del excedente** cuando una causa supera la meta (Épica 4.4).
- ❓ **Lista de causas vetadas** (viene del flujo de verificación, falta OK final).

---

## Parqueado (fuera del MVP por ahora)
- 🅿️ **Split de pagos / marketplace de Mercado Pago** (OAuth, cada beneficiado conecta su MP, la plata va directo, donAR cobra su fee). Es el "conectar sin custodiar + comisión" real. Grande + depende del OK legal.
- 🅿️ **Pulir la historia con IA** al crear una causa. Necesita Edge Function + cuenta Anthropic con facturación. Costo por uso casi nulo.
- 🅿️ **Verificar dominio propio en Resend** para mandar mails a donantes reales (hoy el sender de prueba solo entrega al mail de la cuenta de Resend).
- 🅿️ **Actividad** (tab): TBD, valor post-MVP.
- 🅿️ **Consulta legal** sobre "conectar sin custodiar" (el supuesto más caro; fuera del código pero bloquea la etapa 2).
