# DonAR: Política de Privacidad

**Aviso: esto es un borrador técnico, no asesoramiento legal.** Está redactado a partir de lo que la app realmente hace hoy (código real, no lo que se planea hacer), como base para que un abogado especializado en protección de datos lo revise antes de publicarlo, mismo criterio que el resto del proyecto para materia legal (ver paper fundacional, sección 11.c). Referencia normativa de partida: Ley 25.326 de Protección de Datos Personales de la República Argentina, con la Agencia de Acceso a la Información Pública (AAIP) como autoridad de control.

Versión 0.1. Fecha de redacción: 30 de julio de 2026. Fecha de vigencia: a definir cuando se publique.

---

## 1. Quiénes somos

DonAR es una app de colectas solidarias entre personas, con verificación de causas antes de publicarlas y trazabilidad visible del dinero. El responsable del tratamiento de los datos que se describen acá es [Gastón Pérez / razón social a definir], contactable en [mail de contacto, ver sección 10].

## 2. Qué datos recolectamos

Solo los datos necesarios para que la app funcione. Se agrupan según para qué se usan:

**Para crear tu cuenta:**
- Nombre y apellido.
- Mail.
- Contraseña (nunca se guarda en texto plano: la gestiona nuestro proveedor de autenticación con hash criptográfico).
- Foto de perfil (opcional).

**Para publicar una causa (verificación de identidad):**
- Foto del DNI (frente y dorso).
- Selfie.
- Un documento de respaldo de la necesidad que se plantea (por ejemplo, un presupuesto médico).
- El alias o CBU donde vas a recibir el dinero.
- El texto y las fotos de portada que elijas para contar tu causa, el monto que necesitás y la fecha límite.

**Para donar:**
- El monto que aportás y un mensaje opcional.
- Si donás por transferencia: el comprobante de esa transferencia (una imagen).

**Datos que se generan por usar la app:**
- Historial de causas creadas y aportes hechos o recibidos.
- Puntos, nivel y medallas del programa de reconocimiento.

**Lo que NO recolectamos hoy:** no usamos herramientas de analítica de terceros (no hay Google Analytics, Meta Pixel ni similares integrados en la app a la fecha de este documento), no accedemos a tus contactos, ubicación ni otras apps instaladas.

## 3. Para qué usamos estos datos

- **Verificar tu identidad y tu causa** antes de publicarla: es el corazón del producto, evita causas falsas.
- **Verificar a dónde va el dinero**: el alias/CBU se muestra a quien va a donarte, para que la transferencia llegue al lugar correcto.
- **Mostrar el recorrido del dinero**: los aportes y su estado (pendiente/confirmado) son visibles como parte de la trazabilidad que ofrece donAR.
- **Tu perfil público**: nombre, foto, nivel y medallas se muestran a otros usuarios; es la base del reconocimiento por donar.
- **Comunicarnos con vos**: recuperación de contraseña, avisos sobre el estado de tu causa.
- **Prevenir fraude**: la evidencia de identidad la revisa un curador humano antes de publicar cualquier causa.

No usamos tus datos para publicidad ni los vendemos a terceros.

## 4. Con quién compartimos tus datos

- **Supabase** (proveedor de base de datos, autenticación y almacenamiento de archivos): aloja toda la información de la app en su infraestructura. Es un procesador de datos, no un tercero con el que se comparta con fines propios.
- **Resend** (proveedor de envío de mails): usado para mails transaccionales (por ejemplo, recuperar contraseña).
- **Mercado Pago**: si elegís pagar/donar por este medio (hoy desactivado en la app), tus datos de pago los procesa Mercado Pago directamente, bajo su propia política de privacidad; donAR no almacena datos de tarjetas.
- **Otro donante o beneficiado, según el caso**: el DNI y la selfie de quien publica una causa los ve únicamente esa persona y el curador, nunca otro usuario. El alias/CBU se muestra a quien done a una causa ya publicada, porque es necesario para poder transferir. Los aportes (monto, quién donó salvo que done anónimo) son visibles públicamente como parte de la trazabilidad, que es la propuesta central de donAR.
- No compartimos tus datos con terceros para fines de marketing.

## 5. Dónde se guardan y por cuánto tiempo

Tus datos se almacenan en los servidores de Supabase (infraestructura en la nube). Los conservamos mientras tu cuenta esté activa. Si pedís la baja de tu cuenta, eliminamos o anonimizamos los datos personales que no necesitemos conservar por una obligación legal o para preservar la trazabilidad de aportes ya confirmados a terceros (por ejemplo, no podemos borrar de la vista pública un aporte que otra persona ya donó y que forma parte del historial de una causa, pero sí podemos desvincularlo de tu identidad).

## 6. Cómo protegemos tus datos

- El documento de identidad, la selfie y los comprobantes de transferencia se guardan en almacenamiento privado: solo vos y, para tu causa, un curador autorizado pueden verlos.
- El acceso a cada dato está controlado por reglas a nivel de base de datos (no solo por la app), revisadas periódicamente. Detalle técnico en `docs/ciberseguridad.md`, de uso interno.
- Toda comunicación entre la app y nuestros servidores viaja cifrada (HTTPS/TLS).
- Ninguna causa se publica sin que un curador humano revise la evidencia de identidad primero.

## 7. Tus derechos

Según la Ley 25.326, tenés derecho a acceder, rectificar, actualizar o pedir la supresión de tus datos personales, y a oponerte a un uso concreto que no compartas. Podés ejercerlos escribiéndonos a [mail de contacto, sección 10]. La Agencia de Acceso a la Información Pública (AAIP), como autoridad de control, es la vía de reclamo si considerás que no dimos una respuesta adecuada.

## 8. Menores de edad

DonAR no está destinado a menores de 18 años, porque implica transferencias de dinero y verificación de identidad con documento. Si detectamos una cuenta de un menor, la vamos a dar de baja.

## 9. Cambios a esta política

Si cambiamos esta política de forma relevante, lo vamos a avisar dentro de la app antes de que el cambio entre en vigencia. La fecha de la última actualización siempre figura al principio de este documento.

## 10. Contacto

Para cualquier consulta sobre tus datos o esta política: [mail de contacto a definir; hoy, mientras no exista un dominio propio, gaston.product.expert@gmail.com].

---

*Nota para quien publique esto: reemplazar los campos entre corchetes (razón social, mail de contacto) antes de subir la app a las stores. Cuando se registre el dominio propio (`docs/go-to-market.md`, tarea 14.2), migrar el contacto a un mail del dominio.*
