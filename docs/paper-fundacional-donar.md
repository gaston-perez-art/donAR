# DonAR: paper fundacional

Documento fundacional del proyecto. Define qué es, qué problema resuelve, para quién, cómo gana plata, qué se construye en el MVP y qué riesgos hay que mirar de frente. Es la base para salir a validar, no la especificación final. Todo lo que acá es supuesto está marcado como supuesto.

Versión 0.2. Fecha: 20 de julio de 2026.

---

## 1. Misión, visión y valores

**Misión.** Hacer del mundo un lugar mejor.

**Visión.** Convertirnos en la plataforma que mayor felicidad haya dado a las personas en la historia conocida.

**Valores (propuesta a validar).** Los valores no son decoración: son las reglas que deciden qué se construye y qué no.

| Valor | Qué significa en la práctica |
|---|---|
| Transparencia radical | El recorrido del dinero se ve, siempre. Si algo no se puede mostrar, no se hace. |
| Dignidad de quien pide | Pedir ayuda no estigmatiza. El lenguaje, el diseño y las reglas protegen a quien expone su necesidad. |
| Confianza verificada | Ninguna causa se publica sin verificación. La confianza se gana con evidencia, no se declara. |
| Solidaridad que suma a todos | El que da y el que recibe ganan. La app gana solo cuando el dinero llega a la causa. |

---

## 2. Ficha del proyecto

- **Nombre:** DonAR. Juega con "donar" y "AR" de Argentina.
- **Una frase:** una app donde cualquiera publica su necesidad, la causa se verifica antes de salir, y quien dona recibe reconocimiento por sumar a causas reales, con el recorrido del dinero visible de punta a punta.
- **Problema concreto:** una persona con una necesidad económica urgente no tiene una forma confiable de pedir ayuda a desconocidos. Hoy depende de que un influencer levante su caso o de armar una colecta suelta por redes, sin verificación, sin trazabilidad y sin que el donante sepa a dónde fue su plata.
- **Usuario objetivo:** dos lados. Del lado que pide, personas con una necesidad puntual y urgente (salud, vivienda, una emergencia concreta), con smartphone y sin acceso a canales institucionales. Del lado que da, personas que quieren ayudar pero desconfían de dónde termina el dinero.
- **Plataforma:** app móvil (Android e iOS) más landing web. El público que dona y el que pide vive en el celular. La landing da credibilidad y permite compartir causas por fuera de la app. Supuesto a validar: si el volumen inicial se sostiene con web responsive, se posterga el desarrollo nativo.
- **Alcance del MVP:** ver sección 9.
- **Fuera de alcance por ahora:** ver sección 9.
- **Métrica de éxito:** ver sección 11.
- **Restricciones:** las legales y regulatorias son la restricción dominante (manejo de dinero de terceros). Presupuesto y equipo a definir. Idioma español, foco inicial Argentina.
- **Stack:** a definir en la etapa de construcción, según la sección 4 del manual de trabajo.

---

## 3. El problema

La solidaridad entre desconocidos ya funciona a gran escala, pero sin infraestructura que la sostenga. El caso Santiago Maratea lo prueba en las dos direcciones: prueba que la gente pone plata cuando la causa se percibe justa, y prueba que la confianza es el punto frágil. En 2023, la Inspección General de Justicia declaró irregular e ineficaz el fideicomiso de su colecta para Independiente, señaló "opacidad muy llamativa", ausencia de reglas de protección a terceros y registro fuera de la jurisdicción correspondiente. El dinero llegó, pero el modelo de administración quedó bajo sospecha.

El mercado es real y crece. El crowdfunding en Latinoamérica superó los USD 1.200 millones en 2024, con proyección de triplicarse hacia 2033. En Argentina ya operan plataformas de colectas, pero atienden a organizaciones, no a personas. Donar Online y Nobleza Obliga trabajan con ONGs y fundaciones. GoFundMe, el referente global, permite colectas individuales pero no verifica, no gamifica, ni resuelve la trazabilidad del dinero como producto.

El hueco es concreto: no existe, en Argentina ni en la región, una plataforma que combine tres cosas a la vez. Primero, colecta persona a persona, no solo para ONGs. Segundo, una capa de confianza que verifique la causa antes de publicarla y muestre el recorrido del dinero. Tercero, gamificación que sostenga la participación del que dona. Cada pieza existe suelta en algún producto. Juntas, no las encontré.

---

## 4. Propuesta de valor

DonAR es infraestructura de confianza para la solidaridad entre personas. Conecta a quien necesita ayuda con quien quiere darla, y garantiza que la causa es real y que el dinero llega. La gamificación es el motor de crecimiento; la confianza es lo que se vende.

Para el que pide, la propuesta es concreta: publicá tu necesidad, ganate credibilidad con un proceso de verificación, y accedé a una red de gente dispuesta a ayudar sin depender de que un influencer te elija.

Para el que dona, la propuesta es igual de concreta: la causa fue verificada, ves a dónde va tu plata, y cada aporte suma a un recorrido de impacto que la app reconoce.

En una sola frase: DonAR es la plataforma donde donar es confiable, transparente y gratificante. La diferencia frente a Maratea no es el alcance, es el método. Donde su modelo dejó dudas sobre la administración del dinero, DonAR pone la verificación de la causa y la trazabilidad del aporte en el centro. Esa es la razón por la que alguien elige DonAR y no una transferencia suelta por redes.

---

## 5. Actores

| Actor | Qué hace | Rol en el sistema |
|---|---|---|
| Beneficiado | Publica su necesidad, aporta evidencia y pasa por verificación antes de salir | Origen de la causa. No todos son aprobados, y no todas las causas aprobadas alcanzan la meta: es parte del diseño, no una falla |
| Benefactor | Dona a las causas que elige y acumula reconocimiento por su participación sostenida | Motor de la recaudación y de la gamificación |
| Curador (plataforma) | Revisa y aprueba o rechaza cada causa antes de publicarla | Sistema antifraude del MVP. Humano al inicio, se sistematiza al escalar |

Nota sobre nomenclatura: "beneficiado" y "benefactor" sirven para este documento. Antes de la UI conviene testear nombres que no estigmaticen a quien pide.

---

## 6. Cómo funciona

**Recorrido de una causa:**

1. El beneficiado crea la causa: historia, monto meta, evidencia, identidad.
2. El curador verifica y aprueba o rechaza. Solo las aprobadas se publican.
3. La causa sale con fecha de inicio y de cierre, y una meta visible con barra de progreso.
4. Los benefactores aportan. Cada aporte queda registrado y visible en el recorrido de la causa.
5. Al cerrar, el dinero llega al beneficiado y la app se queda con un porcentaje del total recaudado.

**Flujo del dinero (decisión tomada: híbrido por etapas).**

| Etapa | Cómo fluye la plata | Qué gana | Qué resigna |
|---|---|---|---|
| Etapa 1 (MVP) | La app conecta, no custodia. El benefactor transfiere con comprobante o paga por gateway que liquida directo al beneficiado | MVP liviano en lo legal, valida demanda sin ser fintech regulada | Menos control sobre el dinero: la confianza se sostiene con verificación y trazabilidad, no con retención de fondos |
| Etapa 2 (escala) | Custodia con gateway que retiene el porcentaje automáticamente | Control total y trazabilidad completa del dinero | Carga regulatoria pesada (BCRA, registro como PSP, prevención de lavado, AFIP). Decisión cara y difícil de revertir |

La etapa 2 no se toca antes de tener evidencia de que el producto funciona.

---

## 7. Gamificación

La gamificación arranca por reconocimiento, sin costo monetario. Es la decisión correcta para el MVP por dos razones. Primero, no hay incentivo perverso: si el premio es material, atraés donantes que buscan el premio y no la causa. Segundo, permite medir lo que importa validar, que es si la gente vuelve por la causa o por la recompensa.

El modelo de referencia es el de Wellhub y Pasito, adaptado. Wellhub usa puntos, medallas, rachas y desafíos, y sus insignias desbloquean acceso a beneficios de nivel superior. Pasito da un punto cada mil pasos, canjeable por beneficios en comercios. La mecánica que se toma es la que intuías: X unidades de aporte equivalen a un hito, y los hitos desbloquean estatus.

| Fase | Qué gana el benefactor | Quién lo paga |
|---|---|---|
| MVP | Niveles por causas apoyadas, medallas por hitos ("primer aporte", "diez causas", "una causa completada gracias a vos"), rachas e historial de impacto en el perfil | Nadie: es reconocimiento no monetario, no toca la recaudación |
| Etapa 2 | Beneficios materiales de marcas, desbloqueados por las mismas medallas que hoy dan estatus | Sponsors, que pagan por llegar a una comunidad activa de donantes |

Las marcas no aparecen sin tráfico previo, así que los beneficios materiales dependen de tener volumen y por eso son fase 2. La mecánica de Wellhub sirve de puente: la medalla que hoy da estatus, mañana desbloquea un beneficio.

---

## 8. Modelo de negocio

Ingreso principal: un porcentaje sobre el total recaudado por cada causa que cierra. Es directo, escala con el volumen y alinea el negocio con el éxito de las causas: la app gana cuando el beneficiado cobra. El porcentaje exacto queda por definir y hay que testearlo contra una referencia concreta: Maratea declaró un máximo de 5% para cubrir costos, y ese número marca el techo de percepción tolerable en el mercado argentino. Un fee percibido como alto es un riesgo reputacional directo, así que conviene arrancar bajo y transparente.

Ingreso secundario (fase 2): acuerdos con marcas que pagan por acceder a la comunidad de donantes activos, financiando los beneficios materiales del programa de gamificación. No toca la recaudación de las causas.

Lo que se resigna al elegir el fee sobre recaudación en vez del modelo de publicidad puro de Pasito: el ingreso depende del volumen de colectas exitosas, que al principio será bajo. Es un modelo que recién rinde con escala. Se asume conscientemente porque el fee es lo que alinea el producto con la confianza: la app cobra solo cuando el dinero efectivamente llega a la causa.

**Ingreso terciario, idea volada sin validar (30 jul, propuesta de Gastón).** Si el producto se complejiza, funcionalidades premium de alcance o visibilidad en el feed (por ejemplo, destacar una causa o darle más lugar en el descubrimiento) podrían ser una clave de monetización que no dependa de que una causa cierre, a diferencia del fee. Vale la pena registrarla, pero tiene una tensión real que hay que resolver antes de construir algo: choca de frente con dos principios ya documentados acá (sección 5, el curador no juzga si una causa "merece"; sección 9, sin ranking público competitivo por el riesgo ético de jerarquizar necesidades). Pagar por visibilidad es, de hecho, una forma de jerarquizar necesidades según la capacidad de pago de quien pide, justo lo que el diseño evita hoy. Si se explora en el futuro, conviene separar dos variantes muy distintas éticamente: visibilidad pagada por el BENEFACTOR (alguien banca que una causa ajena se vea más, filantropía de segundo orden, más limpio) vs. visibilidad pagada por el BENEFICIADO (paga el que pide ayuda para que lo vean más, mucho más delicado). Sin desarrollar ni decidir; se retoma cuando haya volumen real y valga la pena confrontar esa tensión.

---

## 9. Alcance del MVP

El MVP existe para aprender, no para impresionar. Las funcionalidades mínimas para que el producto tenga sentido:

1. **Publicar una causa** con historia, monto meta, evidencia y fechas de inicio y cierre.
2. **Verificación por curaduría manual:** flujo interno para aprobar o rechazar cada causa antes de publicarla.
3. **Donar y registrar el aporte:** pago por transferencia con comprobante o gateway que liquida directo al beneficiado, con el aporte visible en el recorrido de la causa.
4. **Trazabilidad visible:** barra de progreso, lista de aportes y estado de la causa, abiertos para que cualquiera vea a dónde va el dinero.
5. **Gamificación por reconocimiento:** niveles, medallas e historial de impacto en el perfil del donante, sin costo.

**Fuera de alcance por ahora (evita scope creep):**

- Custodia de fondos y el andamiaje regulatorio asociado (fase 2).
- Beneficios materiales y sponsors (fase 2).
- Verificación automática de causas a escala (arranca manual).
- Ranking público competitivo entre causas o entre donantes (riesgo ético, se evalúa después).
- Retiros, wallets internas, saldo dentro de la app.

---

## 10. Análisis FODA

| Fortalezas | Debilidades |
|---|---|
| Curaduría manual como antifraude y diferencial de confianza | El ingreso por fee depende de escala: rinde poco al inicio |
| Trazabilidad del dinero como propuesta de valor central | La curaduría manual no escala sin sistematizar |
| Modelo alineado: la app cobra solo cuando el dinero llega | Sin custodia en etapa 1, el control sobre el dinero es menor |
| Gamificación por reconocimiento, sin costo ni incentivo perverso | Equipo y presupuesto todavía por definir |

| Oportunidades | Amenazas |
|---|---|
| Crowdfunding LatAm superó USD 1.200M en 2024, con proyección de triplicarse a 2033 | Riesgo regulatorio: manejar dinero de terceros activa BCRA y registro como PSP |
| Hueco no cubierto: P2P + confianza verificada + gamificación juntos | Fraude: historias falsas dañan la confianza que es el core del producto |
| El caso Maratea probó la demanda y dejó expuesto el gap de confianza | Percepción de fee alto destruye la propuesta de valor |
| Comunidad de donantes activos atractiva para sponsors en fase 2 | Reputacional: gamificar la necesidad ajena puede leerse como espectáculo del sufrimiento |

---

## 11. Riesgos y mitigación

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Regulatorio (el más caro) | Manejar dinero de terceros te vuelve un PSP regulado. Es donde tropezó Maratea | Modelo híbrido: el MVP no custodia. La migración a custodia se hace con asesoramiento legal antes de tocar un peso ajeno. Supuesto a confirmar con abogado: que "conectar sin custodiar" no configure igual intermediación financiera regulada |
| Fraude y credibilidad | Historias falsas o pagos falsos dañan la confianza | Dos frentes. (1) Causa falsa: la curaduría manual es el antifraude del MVP; a baja escala, ser el cuello de botella es fortaleza. (2) Pago falso: modelo de confianza del dinero sin custodia (transparencia del comprobante + confirmación del beneficiado + identidad; solo lo confirmado suma). Detalle completo en la sección 11.b |
| Ético y reputacional | Gamificar la necesidad ajena puede leerse como espectáculo del sufrimiento | El reconocimiento premia al que da, no pone a competir a los que piden. Sin ranking público entre causas. Lenguaje de UI que no estigmatice |
| Percepción del fee | Un fee percibido como alto destruye la confianza | Fee bajo, comunicado con transparencia total, con el 5% de Maratea como techo de lo tolerable |
| Ingreso dependiente de escala | El fee rinde poco hasta que hay volumen | Costo operativo del MVP bajo (curaduría manual, sin custodia, sin desarrollo pesado) para no exigir un volumen que todavía no existe |

---

## 11.b. Confianza del dinero sin custodia (modelo antifraude del pago)

Esta sección es central: es el corazón del modelo "conectar sin custodiar" y de cómo se sostiene la confianza sin que la plataforma toque la plata. Surgió de discutir el flujo de pago por transferencia.

### El punto de partida incómodo

DonAR **no está en el camino del dinero**. Ese es todo el punto de "no custodiar": la plata va del donante al beneficiado, directo. La consecuencia lógica es que **la plataforma nunca puede *probar* técnicamente que una transferencia llegó**, porque no la ve pasar. Aceptar esto no es una debilidad a esconder: es la premisa de diseño.

Entonces el modelo de confianza no es prueba criptográfica ni verificación bancaria. Son tres capas apiladas:

1. **Transparencia:** el comprobante de transferencia queda visible en el recorrido de la causa. Cualquiera lo ve.
2. **Confirmación humana:** el beneficiado confirma que el dinero llegó a su cuenta. Es el único que lo ve.
3. **Identidad verificada:** tanto el que pide como (idealmente) el que da están anclados a una persona real. Mentir expone.

### Por qué la confirmación del beneficiado es el validador correcto

Es tentador pensar "¿y cómo me fío de que el beneficiado diga la verdad de que le llegó?". La respuesta es que los incentivos casi se ordenan solos:

- El beneficiado es **el único que ve la plata** entrar a su cuenta. Ningún curador ni la plataforma tienen esa visibilidad. Por eso el validador natural es él, no un tercero.
- Sus incentivos alinean con la verdad: **quiere** confirmar la plata real (suma a su meta, acerca el cierre) y **no gana nada** confirmando plata que no recibió. Además su identidad está verificada, así que una mentira lo expone.
- El riesgo real **no** es el beneficiado negando lo que recibió. Es el **donante subiendo un comprobante falso** (dice que transfirió y no lo hizo). La confirmación del beneficiado es justamente el filtro contra eso: no confirma lo que no le llegó.

### El hueco que queda, y por qué no lo matamos en el MVP

Queda un único vector: que **beneficiado y donante coludan** para inflar el total de una causa con comprobantes truchos que el beneficiado confirma, sin plata real detrás. Es importante dimensionarlo bien:

- Es **vanidad, no robo.** En un modelo sin custodia no hay dinero de la plataforma en juego. Nadie le saca plata a donAR ni a un tercero: solo se infla un número de prueba social.
- Lo encarecen las capas que ya existen: **curaduría** (un humano aprobó la causa) e **identidad verificada** (los dos coludidos ponen la cara y el DNI).
- El MVP no necesita eliminar el fraude, necesita **hacerlo caro y visible.** Perseguir la prueba perfecta es sobre-ingeniería para esta etapa.

### Regla de oro para la trazabilidad honesta

**Solo la plata confirmada cuenta.** Un aporte por transferencia con comprobante subido pero sin confirmar queda en estado "pendiente": no suma a la meta, no da puntos, no dispara el kudos. Recién al confirmar el beneficiado, cuenta. Esto evita que un comprobante suelto infle la barra de progreso y mantiene la trazabilidad creíble, que es el producto que se vende.

### Nota sobre Mercado Pago

El pago por Mercado Pago tal como está hoy (checkout que cobra a una sola cuenta) es **custodial**: la plata pasaría por donAR, lo contrario a "conectar sin custodiar". Para que MP sea coherente con el eje del proyecto hace falta **split de pagos** (cada beneficiado conecta su propio MP por OAuth y el dinero se reparte directo, con el fee de donAR retenido automáticamente). Eso es etapa 2 y depende del encuadre legal. El flujo canónico del MVP es la **transferencia con comprobante** descrita arriba, que sí es no-custodial por diseño.

---

## 11.c. Encuadre legal y cómo se cobra sin custodiar

Sección clave y el supuesto más caro del proyecto. Basada en investigación de la regulación argentina vigente (jul 2026). **No es asesoramiento legal: hay que confirmarlo con un abogado especializado en fintech/BCRA.** Fuentes al pie del documento de contexto.

### El disparador de la regulación es TENER la plata, no conectar

El régimen del BCRA gira alrededor de una figura: el **PSPCP** (Proveedor de Servicios de Pago que ofrece **Cuentas de Pago**). Lo que obliga a registrarse y cumplir el régimen completo es **ofrecer cuentas de pago donde el cliente tiene un saldo que la plataforma administra**. La norma incluso exige que los PSPCP mantengan el 100% de los fondos de clientes en cuentas "recaudadoras" en bancos. Es decir: **la regulación existe para quien guarda plata de terceros.**

Consecuencia para donAR: si la plataforma **nunca tiene un saldo de nadie** (la plata va directa del donante al beneficiado), la lectura más fuerte es que **no es un PSPCP** y queda fuera del régimen. Ese es exactamente el objetivo del diseño "conectar sin custodiar".

### Cómo se cobra la comisión sin custodiar (la paradoja resuelta)

Pregunta natural: si la plata no pasa por donAR, ¿cómo se cobra el fee? **Lo resuelve la pasarela de pago, no donAR.** Mercado Pago (y cualquier gateway serio) tiene **split de pagos / marketplace**: en el momento del pago, MP parte el monto automáticamente y manda el grueso al beneficiado y la comisión a la cuenta de donAR, atómicamente. La plata del beneficiado nunca toca la cuenta de donAR; donAR recibe **solo su comisión propia**, que es ingreso suyo, no fondos de terceros. Recibir tu propia comisión ≠ custodiar plata ajena. Por eso el split deja cobrar y quedar afuera del problema a la vez.

Para la **transferencia directa** (CBU→CBU) no hay forma de cortar la comisión en el medio: ese es el carril de confianza, sin fee. Se puede monetizar con un **aporte voluntario del donante** a donAR (modelo GoFundMe: comisión 0%, aporte opcional arriba).

### Los otros dos frentes legales

- **Crowdfunding de donación = zona gris.** El régimen de la CNV para "Plataformas de Financiamiento Colectivo" es para crowdfunding de **inversión** (acciones), no donaciones. Las donaciones quedaron **excluidas** de ese marco: no necesitás licencia de la CNV, pero vivís sin un marco propio.
- **Lavado de activos (UIF): el riesgo más subestimado.** El crowdfunding solidario está señalado como herramienta de riesgo de lavado, por la falta de rigor sobre el **origen y destino** de los fondos. Acá el diseño de donAR juega a favor: **identidad verificada + trazabilidad son la defensa.** Según el volumen, donAR podría ser "sujeto obligado" ante la UIF (con deberes de reporte).

### La decisión de MVP que sale de todo esto

El MVP arranca **solo con transferencia directa + aporte voluntario a la plataforma**: cero custodia, cero comisión obligatoria → el modelo más limpio legalmente, y de paso un experimento de willingness-to-pay (¿la gente banca el proyecto sin obligación?). **Mercado Pago queda apagado en el código (no borrado)**, listo para prenderse cuando exista el split de pagos (cobro sin custodia) y el OK legal. El régimen se está endureciendo (Comunicación "A" 8432/2026 sumó la figura "PSPCP como Servicio" y más exigencias UIF), así que la consulta legal es la primera ficha a mover.

### Pregunta afinada para el abogado

> "donAR conecta a quien pide con quien dona. La plata va directa entre ellos: por transferencia CBU→CBU, o (a futuro) por Mercado Pago con split de pagos, donde MP liquida al beneficiado y a donAR le deposita solo su comisión en su propia cuenta. **Nunca hay un saldo de fondos de terceros.** 1) ¿Esto queda fuera del régimen PSPCP del BCRA? 2) Recibir la comisión propia vía split, ¿cuenta como tenencia de fondos de terceros? 3) ¿donAR es sujeto obligado ante la UIF por canalizar donaciones, y qué controles de origen/destino necesita? 4) ¿Qué cambia si en el futuro retiene la plata para descontar la comisión (custodia)?"

---

## 12. Qué validar y cómo medirlo

La pregunta que gobierna el MVP no es si la app es linda de construir, sino si resuelve el problema real de alguien. Se traduce en tres hipótesis, cada una con una métrica, no una sensación.

| Hipótesis | Qué afirma | Métrica |
|---|---|---|
| H1: demanda del que pide | Hay personas dispuestas a exponer su necesidad y pasar por verificación | Causas creadas y porcentaje que completa la verificación en las primeras semanas |
| H2: demanda del que da | La gente dona a causas verificadas de desconocidos dentro de la app | Conversión de visitante a donante, y porcentaje de causas que alcanzan la meta antes del cierre |
| H3: la gamificación retiene por la causa | El reconocimiento no monetario sostiene la participación | Tasa de donantes que vuelven a aportar a una segunda causa. Sin premios materiales en el MVP, si vuelven, vuelven por la causa |

Si las tres hipótesis dan señal positiva a baja escala, hay producto y se justifica invertir en la etapa 2 (custodia, sponsors, verificación sistematizada). Si no dan, se aprendió barato.

---

## 13. Próximos pasos

1. Confirmar con un abogado el encuadre regulatorio del modelo "conectar sin custodiar" en Argentina. Es el supuesto que puede cambiar todo.
2. Definir el fee inicial y testear su percepción con usuarios reales.
3. Diseñar el flujo de verificación de causas con criterios concretos de aprobación y rechazo.
4. Prototipar el recorrido de una causa punta a punta y validar con un puñado de casos reales curados a mano.
5. Elegir el stack según el manual de trabajo (sección 4) y construir por rebanadas verticales.

---

## Fuentes

- Pasito, cómo funciona y modelo de negocio: Infobae, mayo 2026. https://www.infobae.com/tendencias/2026/05/18/caminar-y-sumar-puntos-como-funciona-la-app-que-permite-canjear-pasos-por-productos-en-buenos-aires/
- Pasito, descargas y modelo publicitario: iProfesional. https://www.iprofesional.com/tecnologia/454430-pasito-app-argentina-premia-caminar-cafes-comidas
- Fideicomiso de Maratea declarado irregular por la IGJ: Palabras del Derecho. https://www.palabrasdelderecho.com.ar/articulo/4312/Independiente-la-IGJ-declaro-irregular-e-ineficaz-el-fideicomiso-de-Santiago-Maratea
- Críticas y respuesta de Maratea sobre el fideicomiso: La Nación. https://www.lanacion.com.ar/sociedad/que-paso-con-el-fideicomiso-de-maratea-en-la-colecta-para-independiente-nid01062023/
- Plataformas de crowdfunding en Argentina y tamaño de mercado LatAm: Shopify. https://www.shopify.com/es/blog/plataformas-de-crowdfunding-en-argentina
- Competidores y alternativas de GoFundMe: Business Model Analyst. https://businessmodelanalyst.com/es/Competidores-de-GoFundMe/
- Gamificación de Wellhub (puntos, medallas, rachas, desafíos): Wellhub. https://wellhub.com/en-us/blog/wellness-and-benefits-programs/wellness-incentives/
