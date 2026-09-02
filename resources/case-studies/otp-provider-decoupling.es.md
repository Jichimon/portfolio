---
slug: otp-provider-decoupling
lang: es
type: case-study
title: "Recuperar el segundo factor de autenticación de manos de un proveedor"
subtitle: "Descomponer un servicio de notificaciones sobrecargado y elegir a propósito la opción más cara"
role: "Solution Architect"
context: "Banco regulado · Latinoamérica"
period: "2025"
outcome: "Plan de descomposición aprobado, ejecución arrancada; el corte de OTP no se completó antes de mi salida. El ~70% de reducción en costo mensual era la meta"
stack: [".NET", "AWS Fargate", "AWS Lambda", "AWS EKS", "DynamoDB", "Aurora", "SNS/SQS"]
skills: [architecture-decision-records, cost-engineering, descomposicion-de-servicios, analisis-de-latencia]
featured: true
order: 4
confidentiality: sanitized
---

## Contexto

Un servicio de la plataforma móvil del banco había crecido hasta convertirse en el cuello de botella de todo lo saliente: notificaciones push, correo, mensajería,
registro de tokens de dispositivo, y la generación y validación de códigos de un
solo uso usados como segundo factor de autenticación.

Cinco flujos apenas relacionados (la gran mayoría por el proveedor), un solo deployable, una sola base de datos relacional, una sola curva de escalado. El volumen repartido entre ellos abarcaba tres órdenes de magnitud: las notificaciones push llegaban a decenas de millones al mes, mientras que las operaciones de OTP se movían en cientos de miles. Todo escalaba junto, con la forma del flujo más grande.

El flujo de OTP directamente no era nuestro. Generación, validación y entrega estaban delegadas a un producto externo de OTP-as-a-service, facturado con un premium por verificación.

## Problema

Tres problemas, en el orden en que le importaban al negocio y en el orden inverso al
que resultan interesantes técnicamente.

**Costo.** El producto de verificación del proveedor era el ítem más caro de todo el stack del servicio de correspondencia: más caro que todo el cómputo y todas las bases de datos juntas, por más de un orden de magnitud. Al volumen que ya manejabamos con varios canales digitales, el premium había dejado de valer lo que compraba.

**Control.** El segundo factor de autenticación es un camino crítico, y no era nuestro. El rastro de auditoría vivía en la consola del proveedor, no en nuestros sistemas, lo cual es una posición incómoda para una institución regulada. Y dentro del roadmap se venía TOTP para firmar las transacciones... (también de otro proveedor).

**Acoplamiento.** Flujos con poca relación compartiendo deployable, base de datos y política de escalado. Había lógica de negocio filtrada en el diseño de las tablas. Un incidente en un flujo era un incidente en los cinco.

## Restricciones

- Cada generación y cada intento de validación deben ser auditables y retenidos alrededor de un año, en un entorno regulado.
- Los flujos de autenticación no pueden tener downtime durante la transición.
- Las fronteras de servicio deben mapear a capacidades de negocio bajo el estándar BIAN del banco.
- Un hueco de seguridad implicaba que un usuario podría hacer fraude al banco directamente.
- El equipo que me asignarón eran 2 personas al 40% (seguían trabajando con sus equipos igual), asi que teníamos capacidad de operación limitada.

:::diagram{id="otp-c4-before" type="c4-container"}
Antes: un servicio atendiendo cinco flujos salientes sin relación contra una base compartida.
Spec: anotar cada flujo con su volumen relativo para que la diferencia de tres órdenes de magnitud se vea de un vistazo. Este es el diagrama que sostiene el argumento.
:::

## Enfoque

### Descomposición

El servicio único pasó a ser un orquestador más simple y conectado a tres servicios enfocados:

- **Verificación**: el ciclo de vida completo del OTP: generación, validación,
  seguimiento de intentos y registro de auditoría.
- **Contact handler**: el registro de tokens de dispositivo. Dominado por lecturas,
  estructuralmente distinto de todo lo demás.
- **Push listener**: un consumidor de cola para el flujo de mayor volumen.

El orquestador conserva el ruteo por canal y los registros de envío. Cada servicio
escala ahora sobre su propia curva, y el camino de OTP dejó de heredar el despliegue
de las notificaciones push.

En el servicio de verificación, para el almacenamiento de los "challenges" elegí un motor clave-valor con expiración temporal nativa, de modo que los registros se autoeliminan al final de la ventana de retención en lugar de requerir un job de limpieza programado. Los registros de envío quedaron en el motor relacional, que es donde se consultan.

:::diagram{id="otp-c4-after" type="c4-container"}
Después: orquestador más tres servicios enfocados, con el proveedor reducido únicamente a la entrega del mensaje.
Spec: mismo layout que el diagrama "antes" para poder compararlos lado a lado.
:::

### La decisión de cómputo

Para el servicio de verificación había dos opciones viables.

**Funciones serverless lambda.** Aproximadamente la mitad del costo mensual a nuestro volumen, y más rápidas de construir y sacar a producción.

**Fargates siempre encendidos.** Aproximadamente el doble de costo. P95
predecible, sin cold starts, consistente con la forma en que se opera todo el resto
de la plataforma.

Elegí Fargates (la opción más cara) por razones que tenía que defender contra gerencias (que les importa más el costo que otra cosa):

1. **Cold starts sobre un segundo factor.** Un usuario que quiere abrir su cuenta o recuperar su token para hacer una transacción y se encuentra esperando un código, está en el punto menos tolerante de toda la sesión. Acá la latencia variable es un problema de producto, no solo una métrica.
2. **Dos funciones o un servicio.** El diseño serverless implicaba funciones
   separadas para generación y validación: dos cosas que observar, dos streams de
   logs que correlacionar durante un incidente, dos lugares que tocar cuando llegue
   TOTP.
3. **La diferencia absoluta era chica.** A este volumen, la brecha entre ambas
   opciones era chiquitinga al lado del costo del proveedor que estábamos
   eliminando.

### El número que realmente importaba

El mismo análisis lambda-vs-fargates, aplicado al listener de
notificaciones push a decenas de millones de operaciones mensuales, dio el resultado
opuesto, y no por poco. Serverless habría costado unas cincuenta veces más.

Así que el output útil del análisis nunca fue "usemos fargate". Fue el **punto de equilibrio: alrededor de 430.000 operaciones mensuales**, un umbral que, por debajo gana lambda (sale más barato) pero por encima, lambda-serverless es inconcebible.Ese umbral es reutilizable. Una recomendación no lo es.

:::diagram{id="otp-breakeven" type="table"}
Curvas de costo serverless vs contenedores a lo largo del rango de volumen, con el punto de equilibrio marcado y cada flujo de la plataforma ubicado sobre el eje.
Spec: escala logarítmica en volumen. Marcar dónde caen OTP, contact handler y push listener.
:::

## Resultado

La decisión de cómputo y la descomposición del servicio quedaron aprobadas, y la
ejecución del plan arrancó. Dejé el banco poco después, antes de que el flujo de OTP in-house y el servicio exclusivo de notificaciones push "vieran la luz" (salir a producción). Así que lo que sigue son las metas del plan, no resultados medidos.

- **Reducción proyectada de ~70%** en el costo mensual de operación del stack de
  notificaciones, una vez que la validación de OTP salga por completo del proveedor.
- Rastro de auditoría completo de generaciones e intentos de validación dentro de los sistemas del propio banco. La meta de diseño; el proveedor seguía en el camino crítico cuando me fui.
- Metas de latencia: validación P95 de 83 ms a ≤70 ms; generación P95 de 210 ms a ≤200 ms.

Una nota honesta sobre esa última cifra, que sigue siendo válida como meta. La
generación de OTP parece que no tuviera mucha mejora, porque se mantiene la latencia en el request. La nueva llamada in-house se cancela con la llamada del proveedor. La ganancia buscada acá era costo y control, no latencia. Si lo presentaba como una mejora de latencia habría sido deshonesto, y en la revisión hubiera saltado.

No tengo números post-corte y no los voy a tener: dejé el banco antes de que el flujo de OTP se moviera realmente fuera del proveedor, así que no hay P95 medido ni costo mensual real que reportar. Solo las metas de arriba, del plan que quedó aprobado por 3 instancias (equipo de ingeniería, gerencia y ejecutivos).

## Qué haría distinto hoy

**Elegir el motor de persistencia contra los requisitos de reportería, no solo contra el patrón de acceso.** Seleccioné el motor clave-valor pensando en el camino
de escritura (alto volumen, búsquedas simples por clave, expiración nativa) y dejé la pregunta de analítica marcada como abierta. Eso está al revés. Los datos de auditoría en un entorno regulado existen para ser consultados por gente que no es de
ingeniería, y debí relevar esos patrones de consulta antes de elegir el motor, no
después.

**Abrir con el caso financiero.** El argumento de ingeniería para descomponer era
obvio hacía rato y no había avanzado nada. La propuesta empezó a hacer ruido cuando empecé a presentarla con la tabla de costos primero. En un banco, el argumento de arquitectura es el "lo de menos".

**Planificar un período en sombra.** Correría la validación in-house en paralelo con
la del proveedor, comparando resultados sin actuar sobre los nuestros, antes de
cortar. Sobre un camino de autenticación el costo de esa cautela es bajísimo y el
costo de equivocarse es altísimo.
