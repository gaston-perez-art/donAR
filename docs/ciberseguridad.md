# DonAR: ciberseguridad

Documento vivo de seguridad del proyecto. Registra el modelo de amenaza, el mapa de datos sensibles, las revisiones hechas con su estado, y los principios que rigen cómo se construye seguridad en donAR de acá en más. Complementa al paper fundacional (sección 11.b, modelo antifraude del pago) y a `docs/BACKLOG.md` (Épica 15, donde viven las tareas ejecutables). Todo lo marcado como pendiente de confirmar con un profesional se marca como tal, mismo criterio que el resto del proyecto.

Versión 0.1. Fecha: 30 de julio de 2026.

---

## 1. Modelo de amenaza (resumen)

El cliente (la app React Native) usa la **publishable key** de Supabase, diseñada para ser pública: cualquiera puede extraerla del binario o del tráfico de red sin esfuerzo, y eso es esperado, no un error. La consecuencia es la que define todo lo demás: **cualquier persona con una cuenta real puede hablar directo con la API de Supabase, sin pasar por la UI de la app.** Crear una cuenta es autoregistro abierto, no hay fricción.

De ahí sale el principio de diseño que se adopta desde la revisión del 30 jul: **la única barrera real contra un usuario malicioso es RLS (Row Level Security) en Postgres.** El código de `causes-store.tsx` es experiencia de usuario, no seguridad. Si una política RLS es más permisiva de lo que la UI sugiere, ese hueco lo puede explotar cualquiera, no hace falta ser Gastón probando a mano ni un atacante sofisticado: alcanza con `supabase-js` o Postman y la key pública.

## 2. Mapa de datos sensibles

| Dato | Dónde vive | Quién puede leerlo (tras aplicar los fixes de la Épica 15) | Sensibilidad |
|---|---|---|---|
| DNI frente/dorso, selfie, documento de respaldo | Bucket privado `cause-evidence` + tabla `cause_evidence` | Dueño de la causa + curador | Muy alta (documento de identidad de un tercero) |
| Comprobante de transferencia | Bucket privado `transfer-receipts` | Quien lo subió + dueño de la causa receptora | Alta (puede exponer CBU/alias/monto de un banco de un tercero) |
| Alias/CBU de cobro | Tabla `cause_payouts` | Dueño + curador; público solo una vez que la causa ya está publicada (necesario para poder donar) | Media, autoexpuesto a propósito |
| Mail y contraseña | `auth.users`, gestionado por Supabase Auth | Nadie vía API pública (el esquema `auth` no se expone); la contraseña se guarda hasheada, nunca en texto plano ni en el repo | Alta |
| Nombre, foto de perfil, puntos, medallas | Tabla `profiles`, bucket público `avatars` | Cualquiera (perfil público por diseño: es la base de la gamificación) | Baja/media, intencionalmente pública |
| Historia, monto, fotos de portada de la causa | Tabla `causes`, bucket público `cause-covers` | Cualquiera si la causa está publicada | Baja, es contenido pensado para difundirse |
| Aportes: monto, mensaje, estado | Tabla `contributions` | Cualquiera (la trazabilidad del dinero es el producto, ver paper 11.b) | Media: expone cuánto donó una persona a otra, aceptado como parte del valor central |

## 3. Registro de revisiones de seguridad

### 30 jul 2026 — primer barrido, pre-publicación en Play Store

Pedido de Gastón: revisar todo el código antes de subir la app a la store. Alcance: RLS de Supabase (`supabase/schema.sql`), manejo de secretos en el cliente, storage de evidencia, flujo de auth y deep links. **Estado al cierre de esta revisión: hallazgos documentados y SQL de fix redactado; nada corrido todavía en la base real** (no hay service role key ni CLI linkeado en el repo, toda migración la corre Gastón a mano en el SQL Editor).

| # | Severidad | Hallazgo | Archivo/línea | Estado |
|---|---|---|---|---|
| 15.1 | Crítico | Se puede insertar una `contribution` con `status: 'approved'` y monto arbitrario sin haber transferido nada. La policy `contributions insert` solo valida `donor_id`, no `status` ni `method` | `schema.sql:98-99` | Pendiente de aplicar |
| 15.2 | Crítico | Cualquier usuario puede `update profiles set is_curator = true` sobre sí mismo. Da acceso a leer DNI/selfie de otros y a aprobar/rechazar cualquier causa | `schema.sql:80` | Pendiente de aplicar |
| 15.3 | Alto | El dueño de una causa puede poner `status: 'active'` él mismo, sin pasar por curaduría | `schema.sql:86` | Pendiente de aplicar |
| 15.4 | Medio | El dueño de una causa puede alterar `amount` (y otras columnas) de un aporte ajeno al confirmar/rechazar una transferencia | `schema.sql:263-264` | Pendiente de aplicar |
| 15.5 | Bajo | Deep link `donar://reset-password` usa esquema custom, interceptable en teoría por otra app instalada en Android | `app.json` (`scheme`) | Anotado, se resuelve al pasar a build nativo con dominio propio (App Links verificados) |
| 15.6 | No es código | Falta Privacy Policy publicada y formulario de Data Safety de Play Store, obligatorios porque la app recolecta documento de identidad + selfie (categoría sensible) | — | Texto listo en `docs/privacidad.md`, falta URL pública y completar el formulario en Play Console |

El detalle de cada hallazgo (por qué es explotable, con qué llamada exacta, y el SQL de fix completo con triggers) vive en el historial de la conversación del 30 jul y en `docs/BACKLOG.md` Épica 15. Los cuatro fixes de RLS/triggers se verificaron contra el código real de `causes-store.tsx` (no son teóricos): son compatibles con el flujo de transferencia, confirmación, auto-cierre y reenvío tras "necesita info" tal como están construidos hoy.

## 4. Principios de seguridad adoptados

1. **RLS-first.** Toda regla de negocio central del producto ("solo lo confirmado suma", "solo el curador aprueba una causa") se implementa como policy o trigger en la base, nunca solo como validación en el store de React. El store puede seguir validando para dar buena UX (mensajes de error claros, evitar el viaje de red), pero nunca es la única barrera.
2. **Patrón "trigger de columnas protegidas".** Cuando una policy necesita permitir un `UPDATE` amplio por practicidad (ej. el dueño de una causa actualizando su propia fila), pero solo algunas columnas deberían poder cambiar por ese camino, se usa un trigger `before update` que restaura las columnas protegidas a su valor anterior salvo que la operación venga del `service_role`. Ejemplos concretos en los fixes 15.2, 15.3 y 15.4.
3. **Ningún secreto de servidor en el repo ni en el cliente.** El `MP_ACCESS_TOKEN` y cualquier service role key viven como secretos de Edge Function en el dashboard de Supabase, nunca en `src/` ni versionados. Ya es así hoy; se documenta acá para que siga siendo la regla.
4. **Buckets privados por default.** Un bucket se hace público solo cuando el contenido está pensado para difundirse (portadas de causa, avatares, feature graphics de las stores). Evidencia de identidad y comprobantes de transferencia son privados por diseño desde el día uno.

## 5. Riesgos aceptados conscientemente (no son bugs)

- **Colusión donante-beneficiario.** Que un donante y un beneficiado se pongan de acuerdo para inflar una causa con comprobantes truchos que el beneficiado confirma, sin plata real detrás. Ya documentado y aceptado en el paper fundacional, sección 11.b: es vanidad, no robo (no hay custodia de fondos de donAR en juego, nadie le saca plata a un tercero), y lo encarece la identidad verificada más la curaduría. El MVP no necesita eliminarlo, necesita hacerlo caro y visible.
- **Curaduría manual como único antifraude de causa.** A esta escala, que un humano sea el cuello de botella es una decisión de diseño, no una debilidad (ver FODA del paper). Se sistematiza cuando haya volumen.

## 6. Checklist de seguridad pre-publicación (Play Store)

- [ ] Aplicar los 4 fixes de RLS de la Épica 15 (15.1 a 15.4) en el SQL Editor de Supabase.
- [ ] Confirmar en caliente, con una cuenta de prueba, que `update profiles set is_curator = true` sobre la propia cuenta ahora falla.
- [ ] Confirmar que insertar una `contribution` con `status: 'approved'` fuera del flujo autorizado ahora falla.
- [ ] Pasar el proyecto de Supabase de free tier a un plan pago antes de anunciar el lanzamiento (evita la pausa por inactividad y los techos de almacenamiento/ancho de banda del tier gratuito).
- [ ] Publicar `docs/privacidad.md` en una URL pública y linkearla en la ficha de Play Store.
- [ ] Completar el formulario de Data Safety de Play Console, declarando explícitamente la categoría "información personal sensible / documento de identidad".
- [ ] Términos y condiciones de uso (pendiente, no armado todavía; es un documento distinto de la política de privacidad).
- [ ] Revisión legal formal del encuadre "conectar sin custodiar" (paper, sección 11.c). No bloquea subir el MVP a la store, pero sí bloquea escalar y es la pregunta que un usuario informado o la propia Google podrían hacer sobre cómo se maneja el dinero.

## 7. Próximos pasos

1. Gastón corre el SQL de la Épica 15 en el SQL Editor de Supabase (los 4 fixes).
2. Probar el flujo completo una vez corridos los fixes: donar por transferencia, confirmar, reenviar tras "necesita info", auto-cierre. Nada de esto debería cambiar de comportamiento para un usuario legítimo.
3. Intentar en caliente los dos exploits críticos (auto-nombrarse curador, insertar una donación "approved" trucha) para confirmar que ahora fallan.
4. Publicar la Privacy Policy (`docs/privacidad.md`) en una URL real antes de cargar la ficha de Play Store.
5. Cuando se decida el dominio (`docs/go-to-market.md`, tarea 14.2), mover el contacto de esta política y del proyecto en general a un mail propio (`contacto@donar.ar` o similar) en vez del mail personal de Gastón.
