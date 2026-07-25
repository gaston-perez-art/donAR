# DonAR: flujo de verificación de causas

Documento de producto del MVP. Define cómo una causa pasa de "alguien la escribió" a "está publicada y recibiendo aportes", con criterios concretos de aprobación y rechazo. La verificación es el antifraude del MVP y lo que sostiene toda la propuesta de valor: sin ella, DonAR es una transferencia suelta más.

Versión 0.1. Fecha: 24 de julio de 2026. Estado: propuesta para validar.

---

## 1. Qué verifica el curador, y qué no

El curador no decide si una causa merece ayuda. Decide si es verdadera. Esa distinción es el corazón del diseño y evita el riesgo ético de poner a un humano a juzgar quién sufre lo suficiente.

Verifica tres cosas, y solo tres:

1. La persona que pide existe y es quien dice ser.
2. La necesidad es real y está respaldada por un documento de un tercero.
3. El destino del dinero es verificable.

Si las tres dan, la causa sale. El curador no pondera la historia, no jerarquiza dolores, no elige favoritos. Verifica hechos.

---

## 2. Estados de una causa

Cada causa vive en un solo estado a la vez. Esta es la máquina de estados completa:

| Estado | Qué significa | Quién actúa |
|---|---|---|
| Borrador | El beneficiado la está cargando. No la ve nadie más | Beneficiado |
| En revisión | Enviada, esperando al curador. Acá corre el SLA de 24 hs hábiles | Curador |
| Necesita info | El curador pide algo puntual. Vuelve al beneficiado sin rechazar | Beneficiado |
| Publicada | Pasó la verificación. Visible y recibiendo aportes | Benefactores |
| Rechazada | No pasó. Con motivo explícito y, si corresponde, opción de corregir y reenviar | Beneficiado |
| Cerrada | Llegó a la fecha de cierre o a la meta | Sistema |

El estado "Necesita info" no es un lujo. Sin él, el curador solo puede aprobar o rechazar, y termina rechazando causas legítimas por un papel faltante. Con él, pide lo que falta y la causa sigue viva.

---

## 3. Evidencia mínima requerida

La causa no sale de "En revisión" sin los tres bloques completos. Cada bloque prueba una de las tres cosas que el curador verifica.

### Identidad de quien pide

DNI (foto de frente y dorso) más una selfie sosteniendo el DNI. La selfie confirma que la persona coincide con el documento. Esto ancla cada causa a una persona real y responsable: quien pide responde con nombre y DNI.

Verificación manual por el curador para el MVP. Es suficiente a baja escala y de costo casi nulo, porque el curador ya está mirando la causa. La deuda que asumimos: comparar a ojo no es infalible contra un documento falso bien hecho. La verificación con servicio externo (Renaper, biometría) es más robusta pero suma costo, integración y fricción, y se posterga a fase 2.

### Realidad de la necesidad

Un documento de un tercero que pruebe la necesidad. El tipo depende de la causa: para salud, orden médica, presupuesto de clínica o historia clínica; para vivienda, presupuesto o comprobante del daño; para una emergencia, el documento que corresponda. El principio es único: la necesidad se prueba con un documento de un tercero, no con el relato.

### Destino del dinero

A quién se le paga y cómo. En el MVP, el dinero va al CBU o alias del beneficiado, a nombre del mismo DNI verificado. El destino declarado (para qué es el dinero) queda registrado y visible en la causa.

Lo que se resigna con esta decisión: no se garantiza que el dinero se use exactamente para lo declarado. Se mitiga con dos cosas. La identidad de la persona está expuesta, y el destino queda público en la trazabilidad. Para causas de salud de monto alto, queda abierta como refuerzo la opción de pago directo al proveedor, sin ser obligatoria en el MVP.

---

## 4. Criterios de aprobación

Una causa se aprueba cuando se cumplen todas estas condiciones:

- Identidad confirmada: el DNI es legible y la selfie coincide.
- Necesidad respaldada por un documento de un tercero.
- Destino del dinero verificable: CBU o alias a nombre del DNI verificado.
- Monto meta coherente con la evidencia. No se pide cinco millones con un presupuesto de quinientos mil.
- Sin señales de duplicación: la misma persona o la misma causa no está ya publicada.

Si las cinco dan, se publica. Si una no da y es corregible, va a "Necesita info". Si una no da y no es corregible, se rechaza.

---

## 5. Criterios de rechazo

Una causa se rechaza cuando ocurre cualquiera de estas:

- La identidad no es verificable.
- La evidencia es inconsistente, contradictoria o falsificada.
- El monto es desproporcionado respecto de la evidencia y no se justifica al pedir aclaración.
- El destino del dinero es opaco y no se puede anclar a una cuenta verificada.
- La causa cae en una categoría vetada (sección 6).

El rechazo siempre lleva motivo explícito. Cuando el problema es corregible, se ofrece corregir y reenviar en lugar de cerrar la puerta.

---

## 6. Causas vetadas

No vetar es lo que trae problemas, no vetar. Sin una lista clara, la plataforma publica cualquier cosa y queda expuesta legal y reputacionalmente. La lista se comunica de entrada, antes de que la persona cargue, para que las reglas sean conocidas.

Lista propuesta para el MVP:

| Categoría vetada | Por qué |
|---|---|
| Políticas o partidarias | Riesgo regulatorio y de neutralidad. Colectas de campaña son otro terreno |
| Deudas y juego | Destino imposible de verificar. Atrae el mal uso que el producto quiere evitar |
| Emprendimientos con fin de lucro | Es otro producto (crowdfunding de inversión, con su propia regulación). Diluye el propósito solidario |
| Salud sin respaldo médico | Tratamientos sin orden ni presupuesto verificable. Protege de estafas y de falsas esperanzas |

Todo lo que no cae en la lista se evalúa caso por caso.

---

## 7. Parámetros de operación del MVP

| Parámetro | Valor | Nota |
|---|---|---|
| SLA de revisión | 24 hs hábiles | Exige disponibilidad casi diaria del curador. Es el primer número que presiona al escalar |
| Verificación de identidad | Manual (DNI + selfie) | Servicio externo en fase 2 |
| Destino del dinero | CBU/alias del beneficiado verificado | Pago directo al proveedor opcional para salud de monto alto |
| Curador | Humano, uno al inicio | Se sistematiza en fase 2 |

---

## 8. Qué queda abierto

- Confirmar la lista de causas vetadas con Gastón (sección 6 es propuesta).
- Definir el umbral de "monto alto" en salud que dispara el refuerzo de pago al proveedor.
- Definir criterios de detección de duplicados (hoy es a ojo del curador).
- Encuadre legal del manejo del CBU de terceros: entra en la consulta con abogado sobre "conectar sin custodiar".
