---
slug: multi-tenant-biometric-attendance
lang: es
type: case-study
title: "Una plataforma de asistencia multi-tenant sobre plantas industriales"
subtitle: "Conectar hardware biométrico, un sistema de RRHH de terceros y una app móvil — como monolito modular, a propósito"
role: "Analista de Sistemas & Lead Developer"
context: "Holding agroindustrial · múltiples plantas a nivel nacional"
period: "2022–2023"
outcome: "En producción en varias empresas, miles de empleados"
stack: [".NET", "Entity Framework", "Angular", "terminales biométricas", "modelo C4"]
skills: [multi-tenancy, integracion-de-sistemas, documentacion-de-arquitectura, monolito-modular]
featured: false
confidentiality: sanitized
---

## Contexto

Un holding agroindustrial que opera varias empresas y plantas industriales en el país
necesitaba que sus empleados pudieran marcar asistencia y consultar información de
RRHH desde el celular. Hasta entonces, marcar asistencia significaba una terminal
biométrica en la puerta de planta, y cualquier consulta de RRHH significaba ir hasta
una oficina.

Diseñé y lideré la implementación de la plataforma que conecta esos tres mundos:
hardware biométrico en planta, un sistema de RRHH de terceros y una app móvil en la
mano del empleado.

## Problema

Construir una plataforma de asistencia y autogestión de RRHH que:

- sirva a múltiples empresas cliente dentro del holding, con aislamiento estricto de
  datos entre ellas;
- se integre con las terminales biométricas ya instaladas en las plantas;
- se integre con el sistema de RRHH de terceros, que es el sistema de registro de los
  datos de empleado;
- sincronice entre clientes móviles y backend en tiempo casi real;
- esté arquitecturada para poder venderse eventualmente como SaaS a empresas fuera
  del holding.

## Restricciones

- Las terminales biométricas ya estaban desplegadas y no se podían reemplazar.
- El sistema de RRHH era de terceros y no se podía modificar, solo integrar.
- El aislamiento entre tenants era un requisito contractual del cliente, no una
  preferencia técnica.
- Equipo chico, capacidad de operación única. Lo que construyéramos, lo teníamos que
  operar nosotros.

:::diagram{id="attendance-c4-context" type="c4-context"}
Contexto de sistema: empleados y administradores de RRHH, la app móvil, la plataforma,
las terminales biométricas y el sistema de RRHH de terceros.
Spec: diagrama C4 de contexto existente — sanitizar nombres de proveedor y de empresa antes de publicar.
:::

## Enfoque

### Monolito modular, con fronteras con forma de microservicio

La respuesta obvia en 2022 eran microservicios. Elegí un monolito modular, y
documenté las fronteras entre módulos con diagramas C4 como si fueran servicios, de
modo que extraerlos después fuera un cambio de despliegue y no un rediseño.

Razonamiento: equipo chico, un solo target de despliegue, y una cantidad de tenants
del orden de decenas y no de miles. Los microservicios habrían comprado escalado
independiente que no necesitábamos, al costo de una complejidad operativa que no
podíamos cubrir con la gente que teníamos. Lo valioso eran las fronteras;
distribuirlas no lo era.

Los módulos: datos organizacionales, identidad y accesos, asistencia y comunicaciones
internas — cada uno con su dominio, su acceso a persistencia y un contrato explícito
hacia los demás.

:::diagram{id="attendance-c4-container" type="c4-container"}
Vista de contenedores de la plataforma: app móvil, panel de administración, módulos de
API y la base de datos compartida entre tenants.
Spec: diagrama C4 de contenedores existente. Enfatizar las fronteras de módulo como las
futuras costuras de servicio, y etiquetar la base de datos de tenants como compartida,
no por-tenant.
:::

:::diagram{id="attendance-c4-component" type="c4-component"}
Vista de componentes del módulo de asistencia, incluyendo el camino de integración con
las terminales.
Spec: diagrama C4 de componentes existente.
:::

### Una base de datos compartida entre tenants, con una opción dedicada diseñada pero nunca construida

El aislamiento de los datos de tenant se implementó como una única base de datos
tenant-shared, separada de la base de datos del sistema (configuración y datos
cross-tenant), con cada fila resuelta por tenant id y la conexión ruteada en tiempo
de request. El diseño también contemplaba un camino para que un tenant pudiera optar
por su propia base de datos dedicada en lugar de la compartida, para un cliente cuyo
contrato exigiera aislamiento más fuerte. Ese camino nunca se construyó: los 14
tenants al momento del traspaso corrían sobre la base de datos compartida.

**El trade-off:** una base de datos compartida es mucho más barata de operar — un
solo target de migración, una sola cosa que parchear, una sola cosa que monitorear —
a costa de una garantía de aislamiento más débil que la separación física. Fue una
apuesta razonable dado que el contrato real de cada cliente quedaba satisfecho igual.
Lo que no salió gratis fue diseñar y cargar con la vía de escape de base dedicada en
la capa de acceso a datos para un requisito que ningún cliente terminó ejerciendo —
ese es un costo que pagué por una opcionalidad que nunca usé.

### Integración en dos direcciones

Las terminales biométricas se integraron primero directamente con el sistema de RRHH,
y recién después se trajeron a las APIs propias de la plataforma — un enfoque por
etapas que permitió que la asistencia siguiera funcionando durante la transición, en
vez de exigir un corte simultáneo en todas las plantas.

Del otro lado, una capa de integración se ubica entre el backend móvil propietario y
el sistema de RRHH de terceros, de forma que el proveedor de RRHH siga siendo el
sistema de registro mientras la plataforma es dueña de la experiencia del empleado.

## Resultado

- **14 tenants en producción** dentro del holding al momento del traspaso.
- Marcado remoto de asistencia y autogestión de RRHH para miles de empleados.
- **~30% de reducción en la carga administrativa de RRHH** — consultas que antes
  requerían ir a una oficina pasaron a ser autoservicio.
- Arquitectura posicionada para una futura oferta SaaS — aunque el modelo de base
  compartida necesitaría el camino dedicado por tenant realmente construido antes de
  que esa historia sostenga fuera del holding.

## Qué haría distinto hoy

**No diseñar una vía de escape que no vas a validar.** El plan incluía un camino
para que un tenant optara por una base de datos dedicada en lugar de la compartida,
por si el contrato de algún cliente exigía aislamiento más fuerte. Ningún cliente lo
terminó ejerciendo, así que quedó en la capa de acceso a datos como complejidad que
nadie usó. Enviaría solo el modelo compartido y agregaría el camino dedicado el día
que un contrato real lo exigiera, no antes.

**Verificar el requisito de aislamiento por cliente, no una sola vez para todos.**
Leí "el aislamiento entre tenants es contractual" como una restricción general y
diseñé para el caso más estricto en todos los casos. En la práctica, la base
compartida satisfacía a los 14 tenants que había al traspaso. El requisito era real,
pero debí verificarlo contra el lenguaje contractual de cada cliente en vez de asumir
que la interpretación más estricta aplicaba en todos lados.

**Documentar para quien opera, no solo para quien diseña.** Los diagramas C4 eran
buenos para explicar el diseño e inútiles para operar el sistema a las 3 de la
mañana. Una plataforma repartida en múltiples plantas físicas necesita runbooks tanto
como diagramas de arquitectura.
