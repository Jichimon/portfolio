---
slug: legacy-payment-data-migration
lang: es
type: case-study
title: "Migrar datos de pagos desde un sistema que nadie entendía"
subtitle: "Hacer ingeniería inversa de una feature legacy sin documentación, y escribir una migración que debía ejecutar otro equipo"
role: "Backend Engineer"
context: "Banco regulado · Latinoamérica"
period: "2024"
outcome: "Millones de registros migrados, cero incidentes en producción"
stack: ["SQL Server 2012 → 2022", "T-SQL", "stored procedures por lotes"]
skills: [ingenieria-inversa, migracion-de-datos, documentacion-tecnica, gobernanza, gestion-de-riesgo]
featured: true
order: 4
confidentiality: sanitized
---

## Contexto

El banco estaba dando de baja su vieja app móvil de un proveedor externo y teníamos que sacar una in-house en tiempo record. Con mi equipo, nos encontramos una feature no se podía simplemente reconstruir: los pagos de servicios guardados. Los usuarios habían configurado sus facturas de luz, agua, impuestos, sus beneficiarios recurrentes en la app anterior, durante años. Algunos tenían una docena. Millones de registros en total.

La nueva plataforma usaba otro modelo de datos sobre otro servidor de base de datos, y el flujo de pago en sí ahora pertenecía a otro equipo, detrás de un gateway de pagos. Ese gateway todavía no soportaba pagos guardados multicanal y aun así teníamos que entregar esa la feature a los usuarios.

## Problema

El problema no era la migración. Era que **nadie en la organización sabía cómo funcionaba la feature legacy.**

Sin documentación técnica. Sin los autores originales disponibles. Un esquema en SQL Server 2012 cuya semántica de columnas había que inferir a partir del comportamiento.
Campos que significaban cosas distintas según el valor de otros campos. Estados alcanzables solo mediante secuencias específicas en la UI anterior.
Y los datos son financieros y personales. Un mapeo equivocado no produce una página
rota. Produce un cliente pagando la factura de luz de otra persona.

## Restricciones

**No era dueño de la base de datos y no podía ejecutar en producción.** Bajo el
modelo de gobernanza de datos del banco, los cambios en bases de producción los
ejecuta el equipo de base de datos, previa aprobación de seguridad y gerencia. Mi
entregable no podía ser "una migración que corrí". Tenía que ser una especificación
lo bastante precisa como para que otro equipo la ejecutara sin mí en la sala.

**No se podía bloquear producción.** La base legacy seguía atendiendo tráfico durante la transición.

**Una sola oportunidad.** Una migración de registros financieros no es algo sobre lo que se itera en producción.

**Datos sensibles.** Cada paso sujeto a revisión de seguridad.

## Enfoque

### Fase cero: ingeniería inversa

Antes de escribir cualquier código de migración, comencé a usar la aplicación legacy como usuario y documenté todo lo que hacía. Revisaba la base de datos en cada acción. Cada escenario, cada combinación, cada columna, cada transición de estado. Qué significaba cada campo. Qué lo dejaba en null. Qué lo hacía cambiar.

Es la parte del proyecto donde tardé mucho más y que, desde afuera, parecía no estar
produciendo nada. También fue la parte que me dió la confianza necesaria de que la migración iba a ser correcta.

De ahí salieron dos documentos: una especificación del modelo legacy tal como
realmente se comportaba, y un mapeo columna por columna al modelo destino con la
configuración exacta que requería cada campo de llegada.

### Tres fases, porque el modelo cambiaba de forma

El modelo nuevo no era una versión renombrada del viejo, era otra cosa diferente. Varias columnas legacy se convertían en tablas del nuevo esquema, lo que significaba que tenían padres que debían existir primero. Así que decidí que la migración tenía que ejecutarse en tres fases ordenadas:

1. Extraer a tablas intermedias en el servidor origen, y exportar a archivos planos.
2. Cargar en el servidor nuevo durante una ventana nocturna.
3. Remodelar hacia el modelo destino: la fase donde las columnas se volvían filas de tablas nuevas.

:::diagram{id="migration-phases" type="flow"}
Pipeline de migración en tres fases del servidor legacy al nuevo.
Spec: mostrar, para cada fase, el par de procedimientos migrar/verificar y el loop de lotes.
Enfatizar que la verificación es una compuerta, no un reporte.
:::

### Cada fase tiene su verificador

Cada fase se implementó como dos stored procedures: uno que ejecutaba la migración y
otro que verificaba el resultado contra los criterios de aceptación de esa fase. El
segundo es el que importaba. Un procedimiento de migración te dice que terminó. Un
procedimiento de verificación te dice si quedó bien.

Rutinas auxiliares registraban cada registro tocado: el id de origen, el resultado y, para los rechazos, la razón específica. Al terminar la fase, se podía responder "¿qué pasó con el pago guardado de este cliente en particular?" para cualquier registro del conjunto.

### Siempre por lotes

Todos los procedimientos avanzaban en lotes. Millones de registros contra una base de producción que seguía atendiendo usuarios significa que el único perfil de bloqueo aceptable es corto y repetido. Ninguna transacción larga en ningún punto del
pipeline.

### La decisión de no construir un servicio

El instinto en un equipo de backend es construir un servicio o endpoint de migración.
Elegí stored procedures y SQL, por tres razones:

1. **Es una ejecución única.** Un servicio habría sido un repositorio, un despliegue,
   un pipeline y un set de tests, todo construido para correr una vez y después ser
   borrado. Boilerplate con una vida útil de una sola noche.
2. **Gobernanza.** El equipo de base de datos era dueño de la base de producción, y
   su camino de aprobación, sus herramientas y su proceso de revisión están armados
   alrededor de SQL. Un servicio .NET habría puesto el trabajo *fuera* del camino de
   gobernanza de datos del banco y habría hecho las aprobaciones más lentas, no más
   rápidas.
3. **El entregable nunca fue código: era un runbook.** Como no podía ejecutar en
   producción, el artefacto que importaba era un documento que otro equipo pudiera
   seguir paso a paso. Procedimientos SQL con logging y verificación incorporados
   encajan muchísimo mejor en eso que una aplicación que otro tiene que operar.

## Resultado

- Millones de registros de pagos guardados migrados entre dos versiones mayores de
  base de datos y dos modelos de datos distintos.
- **Cero incidentes en producción relacionados con la migración.**
- Sin contención de bloqueos en la base de producción.
- Trazabilidad registro por registro sobre el conjunto completo.
- Una feature legacy que llevaba años sin documentación quedó completamente especificada.

El costo honesto: tomó bastante más tiempo del estimado. Las primeras etapas fallaron repetidamente, porque sondear el sistema legacy era la única forma de aprender cómo se comportaba, y cada supuesto equivocado aparecía como una corrida de prueba fallida.

## Qué haría distinto hoy

**Presupuestar el discovery como fase propia, con su propia estimación.** Estimé esto como una migración y traté la ingeniería inversa como parte de la implementación. Son actividades distintas con perfiles de riesgo distintos, y meter una dentro de la otra es la razón por la que el cronograma estuvo mal desde el primer día. El discovery sobre un sistema sin documentar no tiene cota hasta que la tiene, y la estimación tiene que decirlo.

**Escribir el procedimiento de verificación antes que el de migración.** En la primera fase, escribí primero el procedimiento de migración, entonces el verificador terminó "moldeado" a lo que la migración suponía.Para los dos siguientes, cambié el orden y funcionó muchísimo mejor: definir qué significa "correcto" antes de escribir la cosa que se va a verificar es test-first aplicado a datos.

**Preguntar antes quién más necesita la especificación.** La documentación del legacy que produje terminó siendo útil para otros dos equipos que también estaban migrando desde el mismo sistema. Me enteré de casualidad, meses después.
