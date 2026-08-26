---
slug: qr-collections-for-merchants
lang: es
type: case-study
title: "Permitir que comercios deleguen el cobro en personas sin cuenta bancaria"
subtitle: "Un modelo de autoridad delegada sobre un core bancario que no tiene concepto de empresa"
role: "Solution Architect & Backend Developer"
context: "Banco regulado · Latinoamérica"
period: "2025"
outcome: "100.000 usuarios en los primeros tres meses"
stack: [".NET", "AWS", "BFF", "microservicios BIAN"]
skills: [modelado-de-dominio, diseño-de-autorizacion, integracion-legacy, product-ownership]
featured: true
order: 2
confidentiality: sanitized
---

## Contexto

Los pequeños comercios cobran mediante códigos QR generados en la app móvil del
banco. El patrón funciona para un negocio unipersonal y se rompe de inmediato más
allá de eso: un dueño de tienda con tres empleados, un restaurante con dos cajas, un
distribuidor con equipo de reparto. Cada cobro tiene que pasar por el teléfono del
dueño.

El workaround que aparecía en la calle era peor que el problema: los dueños les
entregaban sus credenciales bancarias a los empleados.

Fui responsable del producto de punta a punta: discovery, modelo de dominio,
arquitectura y diseño de integraciones, trabajando con UX en los flujos y con el
equipo de implementación en la entrega. Alcanzó 100.000 usuarios a los tres meses
del lanzamiento.

## Problema

Permitir que un titular delegue la capacidad de cobrar en su nombre, donde el
delegado:

- puede no ser cliente del banco, y puede no tener ninguna cuenta bancaria;
- nunca debe ver saldos, datos personales ni movimientos no comerciales del dueño;
- debe ser trazable: cada cobro atribuible a un delegado específico.

Y las transacciones del negocio deben poder separarse de las personales del dueño,
dentro de un core bancario cuyo modelo transaccional no tiene noción de "empresa".

## Restricciones

**El modelo transaccional del core no se podía modificar.** Es el sistema de
registro on-premise de un banco regulado. Agregarle una entidad "negocio" de primer
nivel no estaba sobre la mesa para una primera versión, ni lo estaría por muchas
versiones más.

**Los delegados viven fuera del sistema de identidad.** Todos los caminos de
autenticación existentes asumen un cliente del banco con cuenta y credenciales. Un
delegado no tiene ninguna de las dos.

**Entorno regulado.** Todo lo que toca movimiento de dinero arrastra requisitos de
auditoría, trazabilidad y aprobación.

**Construir sobre la plataforma existente.** La solución debía apoyarse en el BFF y
los microservicios BIAN actuales, no introducir un stack paralelo.

## Enfoque

### Un servicio separado para el dominio de comercios

Un nuevo servicio de dominio es dueño de todo lo relativo a negocios, delegados y
las relaciones entre ellos. Nunca toca saldos ni datos de cuenta: le pide a la
plataforma un QR de cobro y registra el contexto de negocio alrededor. Sacarlo de
los servicios existentes fue deliberado: es una capacidad de negocio nueva, con su
propio ciclo de vida, y las fronteras BIAN hacían que esa fuera la división natural.

:::diagram{id="qr-c4-container" type="c4-container"}
Vista de contenedores: app móvil → BFF → servicio de dominio de comercios, y el camino
hacia el core on-premise para la emisión del QR.
Spec: mostrar con claridad que el servicio de comercios no tiene ningún camino directo
a datos de cuenta o saldo. Esa ausencia es el punto del diagrama.
:::

### Los delegados autentican en un nivel de confianza menor — a propósito

En vez de forzar a los delegados dentro del modelo de identidad de clientes, se los
identifica por una clave compuesta: un identificador único de dispositivo más un
número de teléfono, vinculados al momento de la invitación. El dueño los incorpora
compartiendo una invitación por QR.

Esto es deliberadamente más débil que la autenticación de un cliente. Es aceptable
porque la capacidad otorgada es extremadamente estrecha: generar un QR de cobro de
un solo uso para un negocio específico. Sin acceso a saldos. Sin historial de
transacciones. Sin datos personales. Sin poder sumar otro delegado. El dueño puede
revocar en cualquier momento.

El principio de diseño: **cuando no podés subir el nivel de aseguramiento de una
identidad, bajá el radio de daño de lo que esa identidad puede hacer.** Una
identidad débil con una única capacidad revocable, de un solo uso y sin lectura es
una posición defendible. La misma identidad con acceso de lectura a cualquier cosa
no lo sería.

:::diagram{id="qr-permission-model" type="flow"}
Modelo de permisos: roles Dueño y Delegado contra las operaciones que cada uno puede
ejecutar y los datos que cada uno puede leer.
Spec: matriz de capacidades a dos columnas, con la columna de lectura del delegado casi vacía.
:::

### El contexto de negocio como metadata de la transacción

En lugar de modificar el modelo transaccional del core, cada transacción lleva un
campo de metadata estructurada que la vincula a un negocio y al delegado que generó
el QR. Los libros por negocio, la reportería por delegado y la separación entre
movimientos comerciales y personales son todos *derivados* de esa metadata.

**El trade-off, dicho sin adornos:** un negocio no es una entidad de primer nivel en
el sistema de registro. Es una proyección. Eso compra una primera versión sin tocar
el core, que es la diferencia entre entregar en meses y entregar en años. Cuesta
garantías de consistencia — la metadata vale lo que vale el camino de escritura que
la produce — y significa que promover el negocio a entidad de primer nivel más
adelante es una migración, no un refactor. Dado que la alternativa era no entregar,
fue la decisión correcta, y la volvería a tomar con las mismas reservas.

## Resultado

- **100.000 usuarios en los tres meses posteriores al lanzamiento.**
- **~8 transacciones por segundo a través de cobros delegados** en régimen estable.
- **~15% de los delegados no eran clientes previos del banco**, participando por
  primera vez del ecosistema de pagos del banco — alcanzado sin un plan de marketing
  formal detrás del lanzamiento.
- Cobro delegado disponible para comercios sin hardware adicional.
- Movimientos comerciales y personales separados para el comerciante, sin cambiar el
  modelo transaccional del core.

## Qué haría distinto hoy

**Diseñar revocación y auditoría antes del happy path.** Ambas existen, pero se
diseñaron después de los flujos de invitación y cobro, no en paralelo. En un modelo
de autoridad delegada, la revocación *es* el modelo de seguridad: merece ser el
primer flujo en el pizarrón, no el tercero.

**Modelar la entidad negocio en serio desde el inicio, y elegir diferirla
explícitamente.** Llegué al enfoque de metadata como una forma de rodear una
restricción. La mejor versión de esa misma decisión es modelar primero la entidad de
primer nivel en papel, y recién entonces entregar conscientemente la proyección como
un paso intermedio documentado, con un camino de migración conocido. Mismo
resultado, intención mucho más clara para quien lo herede.

**El crecimiento era previsible y lo planifiqué en arquitectura, pero no en datos.**
El servicio escala. El modelo de reportería construido sobre metadata derivada es la
parte que va a sentir primero los 100.000 usuarios.
