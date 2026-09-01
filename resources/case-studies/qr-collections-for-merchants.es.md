---
slug: qr-collections-for-merchants
lang: es
type: case-study
title: "Permitir que dueños de comercios deleguen el cobro a personas sin cuenta bancaria"
subtitle: "Un modelo de autoridad delegada sobre un core bancario que no tiene concepto de empresa"
role: "Solution Architect & Backend Developer"
context: "Banco regulado · Latinoamérica"
period: "2025"
outcome: "100.000 usuarios en los primeros tres meses"
stack: ["Flutter", ".NET", "SQL Server", "AWS", "BIAN"]
skills: [modelado-de-dominio, diseño-de-autorizacion, integracion-legacy, product-ownership]
featured: true
order: 2
confidentiality: sanitized
---

## Contexto

En Bolivia, ocurre que conseguir una solución de control de cobros necesita un proceso burocrático de mínimo 30 días con un banco. Y muchas veces acuerdos directos con el banco.
Entonces se da que los pequeños comercios cobran mediante códigos QR generados en la app móvil del banco. Generan un QR y comparten por whatsapp el código QR a sus empleados. El empleado no tiene como confirmar la venta más que preguntarle directamente al dueño de la cuenta. Y el tiempo que se come el cliente es mala imagen a fin de cuentas para ese negocio.

El workaround que aparecía en la calle era peor que el problema: los dueños les
entregaban sus credenciales bancarias a los empleados.

Necesitaban una solución que sea accesible, fácil de usar y sin mucho "papeleo".

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

Se diseña un nuevo servicio de dominio que se dueño, amo y señor de todo lo relativo a la solución: negocios, delegados y las relaciones entre ellos. En este servicio nunca se toca saldos ni datos de la cuenta, se le pide a los servicios de QR un qr de cobro y se registra todo el contexto del negocio alrededor. al trabajar con BIAN, todo esto fue más sencillo de lo que parece.

:::diagram{id="qr-c4-container" type="c4-container"}
Vista de contenedores: app móvil → BFF → servicio de dominio de comercios, y el camino hacia el core on-premise para la emisión del QR.
Spec: mostrar con claridad que el servicio de comercios no tiene ningún camino directo a datos de cuenta o saldo. Esa ausencia es el punto del diagrama.
:::

### Los delegados autentican en un nivel de confianza menor, a propósito

¿Cómo funcionan los delegados?
En vez de forzar a los delegados dentro del modelo de identidad de clientes existente, se los identifica por una clave compuesta: un identificador único de dispositivo más un número de teléfono, vinculados al momento de la invitación. El dueño los incorpora compartiendo una invitación por QR.

Esto es deliberadamente más débil que la autenticación de un cliente. Es aceptable porque la capacidad otorgada es extremadamente estrecha: Tener un QR genérico de cobro para un negocio específico. Sin acceso a saldos. Solo viendo el historial de transacciones del QR generado. Sin datos personales. Sin poder sumar otro delegado. El dueño puede revocar en cualquier momento.

El principio de diseño: **cuando ponerle más seguridad a una identidad te quita UX, bajá al mínimo lo que esa identidad puede hacer.** Una identidad débil con una única capacidad revocable y sin lectura es una posición defendible. La misma identidad con acceso de lectura a cualquier cosa no lo sería.

:::diagram{id="qr-permission-model" type="flow"}
Modelo de permisos: roles Dueño y Delegado contra las operaciones que cada uno puede ejecutar y los datos que cada uno puede leer.
Spec: matriz de capacidades a dos columnas, con la columna de lectura del delegado casi vacía.
:::

### El contexto de negocio como metadata de la transacción

En lugar de modificar el modelo transaccional del core, cada transacción lleva un
campo de metadata estructurada que la vincula a un negocio y al delegado que generó
el QR. Los libros por negocio, la reportería por delegado y la separación entre
movimientos comerciales y personales son todos *derivados* de esa metadata.

**El trade-off, sin que suene bonito:** un negocio no es una entidad de primer nivel en el sistema de registro. Es una proyección. Con eso pudimos sacarlo rápido sin tocar el core. Cuesta consistencia? Podríamos decir que si. La metadata en las transacciones es una mina de oro para este tipo de soluciones. A futuro, si es que es necesario por algun motivo modificar el core para incluir más features de esta solución, ya no sería un trabajo de refactorización, sino, sería de migración. Cuando la alternativa directamente era no hacerlo por el tiempo que tomaría modificar el core... se terminó tomando la decisión correcta. Y si se dan circunstancias similiares, no dudaría en volver a tomar esa decisión.

## Resultado

- **100.000 usuarios en los tres meses posteriores al lanzamiento.**
- **~8 transacciones por segundo a través de cobros delegados** en régimen estable.
- **~15% de los delegados no eran clientes previos del banco**, participando por
  primera vez del ecosistema de pagos del banco. Alcanzado sin un plan de marketing
  formal detrás del lanzamiento.
- Cobro delegado disponible para comercios sin hardware adicional.
- Movimientos comerciales y personales separados para el comerciante, sin cambiar el
  modelo transaccional del core.

## Qué haría distinto hoy

**Diseñar revocación y auditoría antes del happy path.** Ambas existen, pero se
diseñaron después de los flujos de invitación y cobro, no en paralelo. En un modelo
de autoridad delegada, la revocación *es* el modelo de seguridad: merece ser el
primer flujo en el pizarrón, no el tercero.

**Modelar la entidad negocio en serio desde el inicio, y elegir diferirla explícitamente.** Llegué al enfoque de metadata como una forma de rodear una
restricción. La mejor versión de esa misma decisión es modelar primero la entidad de
primer nivel en papel, y recién entonces entregar conscientemente la proyección como
un paso intermedio documentado, con un camino de migración conocido. Mismo
resultado, intención mucho más clara para quien lo herede.

**El crecimiento era previsible y lo planifiqué en arquitectura, pero no en datos.**
El servicio escala. El modelo de reportería construido sobre metadata derivada es la
parte que va a sentir primero los 100.000 usuarios.
