---
slug: mobile-banking-platform
lang: es
type: platform
title: "Reconstruir la plataforma móvil de un banco in-house"
subtitle: "Reemplazar la app bancaria de un proveedor por una plataforma cloud-native conectada a un core legacy on-premise"
role: "Backend Engineer → Solution Architect"
context: "Banco regulado · Latinoamérica"
period: "2023–2025"
scale: "Cientos de miles de usuarios activos"
stack: [".NET", "AWS", "SNS/SQS", "MassTransit", "Polly", "SQL Server", "BIAN"]
skills: [sistemas-distribuidos, integracion-legacy, diseño-de-apis, mensajeria-asincrona, entornos-regulados]
featured: true
confidentiality: sanitized
---

## Contexto

Un banco regulado de Latinoamérica operaba su banca móvil sobre el producto de un
proveedor externo. El banco decidió llevar el canal in-house: control total del
roadmap, sin lock-in, y capacidad de entregar features a su propio ritmo.

Entré al equipo de plataforma como backend engineer y terminé siendo responsable
del diseño de varios de sus servicios centrales. Hoy la plataforma atiende a
cientos de miles de usuarios activos.

Esta página es el paraguas. Tres problemas concretos dentro de ella están
documentados en profundidad como case studies separados.

## La restricción central

Todo en esta plataforma está condicionado por un hecho: **la fuente de verdad es un
core bancario legacy que corre on-premise y no se puede mover.** Normativa de
residencia de datos, décadas de lógica de negocio acumulada, y un modelo
transaccional anterior al concepto mismo de canal móvil.

Por eso la plataforma no es "una aplicación en la nube". Es una capa de traducción
entre una malla de servicios cloud-native y un core on-premise, donde cada salto
cruza una frontera de confianza, una de latencia y una de cumplimiento normativo.

:::diagram{id="platform-c4-context" type="c4-context"}
Contexto de sistema: clientes móviles → BFF → microservicios de dominio → core on-premise.
Spec: mostrar la frontera cloud/on-premise como el elemento visual dominante.
Incluir actores externos: proveedor de identidad, proveedor de mensajería, gateway de pagos.
Sin nombres internos de servicios.
:::

## Arquitectura

**Backend for Frontend.** Todas las operaciones móviles entran por un único canal
BFF, dueño de la orquestación, del shaping de respuestas y del fan-out hacia los
servicios de dominio. Así el cliente móvil nunca habla directo con un servicio de
dominio, y los servicios de dominio no cargan con preocupaciones específicas del
canal.

**Fronteras de servicio alineadas a BIAN.** El estándar de arquitectura del banco
mapea servicios a capacidades de negocio, no a capas técnicas. Es una restricción
real, no una formalidad: es la razón por la que la *gestión* de credenciales y la
*verificación* de credenciales viven en servicios distintos (ver abajo), y abarató
enormemente la negociación de contratos de integración entre equipos frente a lo
que habrían costado con fronteras improvisadas.

**Confirmación asincrónica.** Los flujos transaccionales publican en un tópico y
consumen de colas en lugar de bloquearse contra el core. El cliente móvil recibe un
acuse inmediato; la confirmación de liquidación llega después. Eso es lo que bajó el
tiempo de transacción end-to-end de 5–7 segundos a 1–3 segundos.

**Servicio on-premise para datos restringidos.** Un servicio dedicado guarda los
datos de usuario que la normativa no permite alojar en la nube. Los servicios cloud
guardan referencias, no el dato.

## Servicios que diseñé y mantuve

- **BFF del canal móvil** — orquestación, publicación de eventos y consumo de colas
  mediante una abstracción de bus de mensajes.
- **Gateway de identidad** — abstrae a un proveedor comercial de identidad de los
  contratos de usuario del banco; hashea y encripta credenciales antes de que salgan
  del perímetro; sirve a todos los canales digitales.
- **Servicio de credenciales** — creación, reset y ciclo de vida de credenciales,
  invocable desde agencia, web y móvil.
- **Servicio de instrucciones de pago** — orquesta las llamadas al gateway de pagos,
  con políticas de reintento y manejo explícito del estado transaccional.
- **Servicio de correspondencia** — comunicación saliente unificada: push, correo y
  mensajería, más la entrega de códigos de un solo uso.
- **Servicio de datos on-premise** — almacenamiento con residencia regulada.

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

- Tiempo de transacción end-to-end reducido de 5–7 s a 1–3 s.
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

**Documentación para audiencias no técnicas.** Mis documentos de diseño estaban
escritos para ingenieros. Cuando tuve que defender decisiones ante gerencia, me pasé
la reunión traduciendo en vez de argumentando. El trabajo de arquitectura en un
entorno regulado es en parte un problema de comunicación, y subinvertí en esa mitad.

## Deep dives

- [Cobros con QR para comercios](/case-studies/qr-collections-for-merchants)
- [Desacoplar los códigos de un solo uso de un proveedor externo](/case-studies/otp-provider-decoupling)
- [Migrar datos de pagos legacy que nadie entendía](/case-studies/legacy-payment-data-migration)
