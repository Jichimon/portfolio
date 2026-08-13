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

:::diagram{id="biosys-c4-context" type="c4-context"}
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

:::diagram{id="biosys-c4-container" type="c4-container"}
Vista de contenedores de la plataforma: app móvil, panel de administración, módulos de
API y bases de datos por tenant.
Spec: diagrama C4 de contenedores existente. Enfatizar las fronteras de módulo como las
futuras costuras de servicio.
:::

:::diagram{id="biosys-c4-component" type="c4-component"}
Vista de componentes del módulo de asistencia, incluyendo el camino de integración con
las terminales.
Spec: diagrama C4 de componentes existente.
:::

### Una base de datos por tenant

El aislamiento se implementa como una base de datos separada por empresa cliente. El
tenant se resuelve en tiempo de request y la conexión se rutea en consecuencia.

**El trade-off:** base-por-tenant da la garantía de aislamiento más fuerte disponible
sin llegar a infraestructura separada — que es exactamente lo que exigía el contrato
del cliente, y lo que hace creíble una historia de SaaS a futuro. Cuesta fan-out de
migraciones. Cada cambio de esquema se ejecuta N veces, y N crece con cada cliente
nuevo. Es un impuesto operativo real, y es la razón por la que revisaría esta
decisión a otra escala en vez de fingir que salía gratis.

### Integración en dos direcciones

Las terminales biométricas se integraron primero directamente con el sistema de RRHH,
y recién después se trajeron a las APIs propias de la plataforma — un enfoque por
etapas que permitió que la asistencia siguiera funcionando durante la transición, en
vez de exigir un corte simultáneo en todas las plantas.

Del otro lado, una capa de integración se ubica entre el backend móvil propietario y
el sistema de RRHH de terceros, de forma que el proveedor de RRHH siga siendo el
sistema de registro mientras la plataforma es dueña de la experiencia del empleado.

## Resultado

- En producción en varias empresas del holding.
- Marcado remoto de asistencia y autogestión de RRHH para miles de empleados.
- Menor carga administrativa en los departamentos de RRHH: consultas que antes
  requerían ir a una oficina pasaron a ser autoservicio.
- Arquitectura y modelo de aislamiento posicionados para una futura oferta SaaS.

[NEEDS INPUT] Cantidad de tenants al momento del traspaso, y alguna medida de la
reducción en la carga administrativa de RRHH. Aunque sea una cifra aproximada haría
concreta la sección de impacto.

## Qué haría distinto hoy

**Automatizar el pipeline de migración de tenants desde el día uno.** Elegí
base-por-tenant sabiendo que multiplicaba el esfuerzo de migración, y después manejé
las migraciones a mano durante más tiempo del que debía. Si el modelo de aislamiento
crea N de algo, el tooling para ejecutar cosas N veces es parte del modelo de
aislamiento, no una tarea posterior.

**Considerar esquema-por-tenant como punto intermedio.** Da la mayor parte del
aislamiento con un único target de migración. En este caso puntual el lenguaje
contractual del cliente apuntaba a bases separadas, pero no evalué seriamente la
alternativa: fui directo a la opción más fuerte porque era la más fácil de defender,
que no es lo mismo que ser la mejor.

**Documentar para quien opera, no solo para quien diseña.** Los diagramas C4 eran
buenos para explicar el diseño e inútiles para operar el sistema a las 3 de la
mañana. Una plataforma repartida en múltiples plantas físicas necesita runbooks tanto
como diagramas de arquitectura.
