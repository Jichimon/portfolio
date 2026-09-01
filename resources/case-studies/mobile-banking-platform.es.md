---
slug: mobile-banking-platform
lang: es
type: platform
title: "Reconstruir la plataforma móvil de un banco in-house"
subtitle: "Reemplazar la app bancaria de un proveedor externo por una plataforma in-house cloud-native conectada a un core legacy on-premise aplicando BIAN"
role: "Backend Engineer → Solution Architect"
context: "Banco regulado · Latinoamérica"
period: "2023–2025"
scale: "+1M"
scale_caption: "usuarios activos"
stack: [".NET",  "Flutter", "Android", "iOS", "AWS", "SNS/SQS", "Postgres", "SQL Server", "RabbitMq", "MassTransit", "BIAN", "Firebase", "Azure DevOps", "Application Insights"]
skills: [sistemas-distribuidos, integracion-legacy, diseño-de-apis, mensajeria-asincrona, entornos-regulados, micro-servicios, clean-architecture, DDD]
featured: true
order: 1
confidentiality: sanitized
---

## Contexto

Un banco regulado de Latinoamérica operaba su banca móvil sobre el producto de un proveedor externo. El banco decidió que sea in-house: Tener control total del roadmap, sin lock-in, y capacidad de entregar features a su propio ritmo.

Entré al equipo de plataforma como backend-frontend engineer y terminé siendo responsable del diseño de varios de sus servicios centrales. Hoy la plataforma atiende a más de un millón de usuarios activos.

Esta página es el paraguas. Tres problemas concretos dentro de ella están
documentados en profundidad como case studies separados.

## La restricción central

Todo en esta plataforma está condicionado por un hecho: **la fuente de verdad es un core bancario legacy que corre on-premise y no se puede mover.** Normativa de residencia de datos, décadas de lógica de negocio acumulada, y un modelo transaccional anterior al concepto mismo de canal móvil.

Por eso la plataforma no es solamente "una aplicación en la nube". Es una capa de traducción entre una malla de servicios cloud-native y un core on-premise, donde cada salto cruza una frontera de confianza, una de latencia y una de cumplimiento normativo.

:::diagram{id="platform-c4-context" type="c4-context"}
Contexto de sistema: clientes móviles → BFF → microservicios de dominio → core on-premise.
Spec: mostrar la frontera cloud/on-premise como el elemento visual dominante.
Incluir actores externos: proveedor de identidad, proveedor de mensajería, gateway de pagos.
Sin nombres internos de servicios.
:::

## Arquitectura

**Backend for Frontend.** Todas las operaciones de la aplicación móvil entran por un único canal BFF, dueño de la orquestación, del shaping de respuestas y del fan-out hacia los servicios de dominio. Así el cliente móvil nunca habla directo con un servicio de dominio, y los servicios de dominio no cargan con preocupaciones específicas del canal.

**Fronteras de servicio alineadas a BIAN.** El estándar de arquitectura del banco mapea servicios a capacidades de negocio, no a capas técnicas. Es una restricción real, no una formalidad: es la razón por la que la *gestión* de credenciales y la *verificación* de credenciales viven en servicios distintos (ver abajo), y abarató enormemente la negociación de contratos de integración entre equipos frente a lo que habrían costado con fronteras improvisadas.

**Confirmación asincrónica.** Las confirmaciones de las entradas y salidas de transacciones se publican en topics de SNS y se encolan en SQS de cada canal. El cliente móvil recibe la notificación de transacción entrante o saliente al toque. Eso es lo que bajó la percepción de cada transacción end-to-end de 5-7 segundos a 1–3 segundos.

**Servicio on-premise para datos restringidos.** Un servicio dedicado guarda los datos de usuario que la normativa no permite alojar en la nube. Los servicios cloud guardan referencias, no el dato. Todo el sistema legacy del banco también se encuentra on-premise.

## Despliegue en Nube

Toda la infrastructura se encontraba hosteada en AWS. Cada equipo manejaba sus propias EKS, donde según la carga que recibía cada "pod" se podían escalar horizontalmente hasta 5 de ellos. y si la carga bajaba, se mantenía funcionando 1 o 2 dependiendo del servicio. Cada servicio tenía sus propias especificaciones acorde a la carga que debía soportar verticalmente.

Todo se controlaba a través de terraform. Los despliegues eran realizados a través de AzureDevOps. Usando Azure Application Insights para observabilidad.

## Servicios que diseñé y mantuve

- **BFF del canal móvil**: orquestación de todos los flujos de la aplicación (auth, transacciones, pago de servicios, historial, etc.) y sus conexiones con los servicios respectivos, publicación de eventos y consumo de colas mediante una abstracción de bus de mensajes.
- **Gateway de identidad**: abstrae a un proveedor comercial de identidad de los contratos de usuario del banco; hashea y encripta credenciales antes de que salgan del perímetro; sirve a todos los canales digitales.
- **Servicio de credenciales**: creación, reset, ciclo de vida de credenciales y envío a través del servicio de correspondencia. Invocable desde agencia, web y móvil.
- **Servicio de instrucciones de pago**: orquesta las llamadas al gateway de pagos para todos los canales digitales, con políticas de reintento y manejo explícito del estado transaccional.
- **Servicio de correspondencia**: comunicación saliente unificada: push, correo y mensajería, más la entrega de códigos de un solo uso.
- **Servicio de datos on-premise**: almacenamiento con residencia regulada.

## Una decisión que vale la pena explicar: dos servicios, no uno

La *gestión* de credenciales y la *verificación* de identidad se separaron en dos
servicios. La objeción obvia es que se trata de un solo bounded context y que un
único deployable sería más simple.

Los perfiles de carga son completamente distintos. La verificación corre en cada
login y cada refresco de sesión: alto volumen y crítica en latencia. La gestión de
credenciales corre en el alta, el reset y la recuperación: bajo volumen y tolerante
a latencia. Acoplarlas significa que un incidente en gestión de credenciales puede
tumbar el login de todos los canales a la vez.

Separarlas permitió que cada una escale sobre su propia curva y mantuvo delgado el
camino crítico. El costo es un salto de red adicional y dos deployables que operar.
A este volumen, era el lado correcto del trade-off.

:::diagram{id="platform-auth-boundary" type="c4-container"}
Vista de contenedores de la separación entre servicio de credenciales y gateway de identidad.
Spec: destacar la diferencia de volumen entre ambos caminos con grosor de aristas o anotaciones.
Mostrar los tres canales consumidores.
:::

## Resultados

- Tiempo de transacción end-to-end reducido de 5-7s a 1-3s.
- Dependencia del proveedor externo eliminada para el canal móvil.
- Mejora medible en los indicadores de satisfacción del cliente tras la migración.
- Arquitectura capaz de escalar horizontalmente por capacidad y no como un monolito.

## Qué haría distinto hoy

**La abstracción de canales.** Modelé el comportamiento por canal extendiendo una
clase base una vez por canal. Los canales resultaron diferir mucho más de lo que
asumí, y el árbol de herencia quedó con la forma equivocada: un mapa de
configuración dentro de una única implementación base habría absorbido la variación
sin un tipo nuevo por canal. Hoy trato "una subclase por integración externa" como
un smell hasta demostrar que la variación es de comportamiento y no estructural.

**Design Pattern como over-engineering.** Implementé el patrón de diseño state, para algo que realmente no lo necesitaba. En BFF dupliqué la lógica de transacciones, cuando esa distinción ya existía en service payment. Un simple switch hubiera simplificado muchas cosas.

**Documentación para audiencias no técnicas.** Mis documentos de diseño estaban
escritos para ingenieros. Cuando tuve que defender decisiones ante gerencia, me pasé
la reunión traduciendo en vez de argumentando. El trabajo de arquitectura en un
entorno regulado es en parte un problema de comunicación, y subinvertí en esa mitad.

## Deep dives

- [Permitir que comercios deleguen el cobro en personas sin cuenta bancaria](/case-studies/qr-collections-for-merchants)
- [Recuperar el segundo factor de autenticación de manos de un proveedor](/case-studies/otp-provider-decoupling)
- [Migrar datos de pagos desde un sistema que nadie entendía](/case-studies/legacy-payment-data-migration)
