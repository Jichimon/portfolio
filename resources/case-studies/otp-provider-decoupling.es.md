---
slug: otp-provider-decoupling
lang: es
type: case-study
title: "Recuperar el segundo factor de autenticación de manos de un proveedor"
subtitle: "Descomponer un servicio de notificaciones sobrecargado y elegir a propósito la opción de cómputo más cara"
role: "Solution Architect"
context: "Banco regulado · Latinoamérica"
period: "2025"
outcome: "~70% de reducción en el costo mensual de operación del stack de notificaciones"
stack: [".NET", "AWS Fargate", "AWS Lambda", "DynamoDB", "Aurora", "SNS/SQS"]
skills: [architecture-decision-records, cost-engineering, descomposicion-de-servicios, analisis-de-latencia]
featured: true
confidentiality: sanitized
---

## Contexto

Un servicio de la plataforma móvil del banco había crecido hasta convertirse en el
cajón de sastre de todo lo saliente: notificaciones push, correo, mensajería,
registro de tokens de dispositivo, y la generación y validación de códigos de un
solo uso usados como segundo factor de autenticación.

Cinco flujos sin relación entre sí, un solo deployable, una sola base de datos
relacional, una sola curva de escalado. El volumen repartido entre ellos abarcaba
tres órdenes de magnitud: las notificaciones push llegaban a decenas de millones al
mes, mientras que las operaciones de OTP se movían en cientos de miles. Todo
escalaba junto, con la forma del flujo más grande.

Y el flujo de OTP directamente no era nuestro. Generación, validación y entrega
estaban delegadas a un producto externo de OTP-as-a-service, facturado con un premium
por verificación.

## Problema

Tres problemas, en el orden en que le importaban al negocio y en el orden inverso al
que resultan interesantes técnicamente.

**Costo.** El producto de verificación del proveedor era el ítem más grande de todo
el stack de notificaciones: más grande que todo el cómputo y todas las bases de datos
juntas, por más de un orden de magnitud. A nuestro volumen, el premium había dejado
de valer lo que compraba.

**Control.** El segundo factor de autenticación es un camino crítico, y no era
nuestro. El rastro de auditoría vivía en la consola del proveedor, no en nuestros
sistemas, lo cual es una posición incómoda para una institución regulada. Y un ítem
del roadmap que sabíamos que venía —TOTP para firma de transacciones— no tenía
camino posible dentro del producto del proveedor.

**Acoplamiento.** Flujos sin relación compartiendo deployable, base de datos y
política de escalado. Había lógica de negocio filtrada en el diseño de las tablas. Un
incidente en un flujo era un incidente en los cinco.

## Restricciones

- Cada generación y cada intento de validación deben ser auditables y retenidos
  alrededor de un año, en un entorno regulado.
- Los flujos de autenticación no pueden tener downtime durante la transición.
- Las fronteras de servicio deben mapear a capacidades de negocio bajo el estándar
  BIAN del banco.
- Equipo chico. La cantidad de cosas que podíamos permitirnos *operar* era un límite
  real del diseño.

:::diagram{id="otp-c4-before" type="c4-container"}
Antes: un servicio atendiendo cinco flujos salientes sin relación contra una base compartida.
Spec: anotar cada flujo con su volumen relativo para que la diferencia de tres órdenes
de magnitud se vea de un vistazo. Este es el diagrama que sostiene el argumento.
:::

## Enfoque

### Descomposición

El servicio único pasó a ser un orquestador delgado más tres servicios enfocados:

- **Verificación** — el ciclo de vida completo del OTP: generación, validación,
  seguimiento de intentos y registro de auditoría.
- **Contact handler** — el registro de tokens de dispositivo. Dominado por lecturas,
  estructuralmente distinto de todo lo demás.
- **Push listener** — un consumidor de cola para el flujo de mayor volumen.

El orquestador conserva el ruteo por canal y los registros de envío. Cada servicio
escala ahora sobre su propia curva, y el camino de OTP dejó de heredar el despliegue
de las notificaciones push.

Para el almacenamiento de los desafíos elegí un motor clave-valor con expiración
temporal nativa, de modo que los registros se autoeliminan al final de la ventana de
retención en lugar de requerir un job de limpieza programado. Los registros de envío
quedaron en el motor relacional, que es donde se consultan.

:::diagram{id="otp-c4-after" type="c4-container"}
Después: orquestador más tres servicios enfocados, con el proveedor reducido únicamente
a la entrega del mensaje.
Spec: mismo layout que el diagrama "antes" para poder compararlos lado a lado.
:::

### La decisión de cómputo

Para el servicio de verificación había dos opciones viables.

**Funciones serverless.** Aproximadamente la mitad del costo mensual a nuestro
volumen, y más rápidas de construir y sacar a producción.

**Contenedores siempre encendidos.** Aproximadamente el doble de costo. P95
predecible, sin cold starts, consistente con la forma en que se opera todo el resto
de la plataforma.

Elegí contenedores —la opción más cara— por razones que no tenían nada que ver con
la factura mensual:

1. **Cold starts sobre un segundo factor.** Un usuario que ya ingresó su contraseña
   y está esperando un código está en el punto menos tolerante de toda la sesión.
   Latencia de cola variable ahí es un problema de producto, no solo una métrica.
2. **Dos funciones o un servicio.** El diseño serverless implicaba funciones
   separadas para generación y validación: dos cosas que observar, dos streams de
   logs que correlacionar durante un incidente, dos lugares que tocar cuando llegue
   TOTP.
3. **La diferencia absoluta era chica.** A este volumen, la brecha entre ambas
   opciones era un error de redondeo al lado del costo de proveedor que estábamos
   eliminando. Optimizarla habría sido optimizar el número equivocado.

### El número que realmente importaba

El mismo análisis serverless-contra-contenedores, aplicado al listener de
notificaciones push a decenas de millones de operaciones mensuales, dio el resultado
opuesto — y no por poco. Serverless habría costado unas cincuenta veces más.

Así que el output útil del análisis nunca fue "usá contenedores". Fue el **punto de
equilibrio: alrededor de 430.000 operaciones mensuales**, por debajo del cual gana
serverless y por encima del cual no. Ese umbral es reutilizable. Una recomendación
no lo es.

:::diagram{id="otp-breakeven" type="table"}
Curvas de costo serverless vs contenedores a lo largo del rango de volumen, con el punto
de equilibrio marcado y cada flujo de la plataforma ubicado sobre el eje.
Spec: escala logarítmica en volumen. Marcar dónde caen OTP, contact handler y push listener.
:::

## Resultado

- **~70% de reducción en el costo mensual de operación** del stack de notificaciones.
- Validación de OTP totalmente in-house, sacando al proveedor del camino crítico.
- Rastro de auditoría completo de generaciones e intentos de validación dentro de los
  sistemas del propio banco.
- Metas de latencia: validación P95 de 83 ms a una meta de ≤70 ms; generación P95 de
  210 ms a una meta de ≤200 ms.

Una nota honesta sobre esa última cifra. La generación mejora apenas, porque está
dominada por el salto de mensajería saliente hacia el proveedor de entrega, salto que
mantuvimos. Agregamos una llamada de red y quitamos una llamada más lenta del
proveedor, y las dos se cancelan casi por completo. La ganancia acá fue costo y
control. Presentarlo como una mejora de latencia habría sido deshonesto, y la
revisión lo habría detectado.

[NEEDS INPUT] P95 medido post-implementación y costo mensual real, si el rollout ya
terminó. Reemplazar metas por resultados medidos convertiría a este en el case study
más fuerte del portfolio.

## Qué haría distinto hoy

**Elegir el motor de persistencia contra los requisitos de reportería, no solo
contra el patrón de acceso.** Seleccioné el motor clave-valor pensando en el camino
de escritura —alto volumen, búsquedas simples por clave, expiración nativa— y dejé la
pregunta de analítica marcada como abierta. Eso está al revés. Los datos de auditoría
en un entorno regulado existen para ser consultados por gente que no es de
ingeniería, y debí relevar esos patrones de consulta antes de elegir el motor, no
después.

**Abrir con el caso financiero.** El argumento de ingeniería para descomponer era
obvio hacía rato y no había avanzado nada. La propuesta se movió la semana en que
empezó con la tabla de costos. En un banco, el argumento de arquitectura es el
segundo argumento.

**Planificar un período en sombra.** Correría la validación in-house en paralelo con
la del proveedor, comparando resultados sin actuar sobre los nuestros, antes de
cortar. Sobre un camino de autenticación el costo de esa cautela es bajísimo y el
costo de equivocarse es altísimo.
