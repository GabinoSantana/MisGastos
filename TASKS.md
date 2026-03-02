# TASKS - Serverless Hardening SDD

Este archivo es la fuente operativa diaria para ejecutar SDD por tareas.
La estrategia macro vive en el plan aprobado y aqui se gestiona el avance por task.

## Task Lifecycle

Estados permitidos:

- `todo`
- `in_progress`
- `review`
- `done`
- `blocked`

Regla de flujo:

- Solo una task en `in_progress` por implementador.
- Toda task pasa por `review` antes de `done`.
- Si una dependencia no esta en `done`, la task queda `blocked`.

## Stories (P0..P4)

### P0 - Security Hardening

- **Objetivo**: proteger el webhook y reducir superficie de ataque.
- **In scope**: validacion de secret token, POST-only, logging seguro, rate limiting.
- **Out of scope**: rediseño async completo.
- **Riesgos**: bloqueo de requests legitimos por configuracion incorrecta.

### P1 - Async Core

- **Objetivo**: desacoplar ingreso y procesamiento con SQS + worker + DLQ.
- **In scope**: ingress lambda, queue principal, DLQ, worker, retries.
- **Out of scope**: rediseño profundo de agregados de negocio.
- **Riesgos**: duplicados, mal ajuste de visibility timeout.

### P2 - Data Model Optimization

- **Objetivo**: optimizar consultas mensuales y costo/latencia.
- **In scope**: agregados mensuales y lectura optimizada para resumen/listado.
- **Out of scope**: analytics avanzados fuera del caso de uso.
- **Riesgos**: inconsistencias de agregados por idempotencia incompleta.

### P3 - Observability and Cost

- **Objetivo**: mejorar operabilidad y control de costos.
- **In scope**: alarmas, dashboard, retencion de logs, rightsizing.
- **Out of scope**: plataforma de observabilidad externa.
- **Riesgos**: exceso de ruido de alarmas o tuning insuficiente.

### P4 - Validation and Release

- **Objetivo**: asegurar rollout seguro y reversible.
- **In scope**: test E2E, carga controlada, rollback plan, documentacion final.
- **Out of scope**: cambios funcionales nuevos para usuario final.
- **Riesgos**: cobertura de pruebas insuficiente para edge cases.

## Task Template (usar en todas las fases)

```md
### <task_id> - <titulo>

- story_id:
- owner:
- prioridad: Critical|High|Medium|Low
- objetivo:
- resultado_esperado:
- archivos_impactados:
- dependencias:
- riesgo: alto|medio|bajo
- criterio_aceptacion:
  - ...
- evidencia_requerida:
  - tests:
  - logs/metricas:
  - documentacion:
- estado: todo|in_progress|review|done|blocked
```

## Backlog Priorizado por Fase

### S0 - Backlog Governance

### S0-T1 - Definir historias P0..P4

- story_id: S0
- owner: ops
- prioridad: Critical
- objetivo: formalizar alcance y limites por fase.
- resultado_esperado: stories consistentes con objetivo, scope y riesgo.
- archivos_impactados: `TASKS.md`
- dependencias: ninguna
- riesgo: bajo
- criterio_aceptacion:
  - cada fase P0..P4 tiene objetivo, in scope, out of scope y riesgos
  - orden oficial `P0 -> P1 -> P2 -> P3 -> P4` definido
- evidencia_requerida:
  - tests: N/A
  - logs/metricas: N/A
  - documentacion: seccion Stories completa
- estado: done

### S0-T2 - Definir plantilla unica de task

- story_id: S0
- owner: ops
- prioridad: Critical
- objetivo: unificar formato de ejecucion y cierre de tasks.
- resultado_esperado: template reusable en todo el backlog.
- archivos_impactados: `TASKS.md`
- dependencias: S0-T1
- riesgo: bajo
- criterio_aceptacion:
  - template contiene todos los campos minimos acordados
  - estados validos documentados
- evidencia_requerida:
  - tests: N/A
  - logs/metricas: N/A
  - documentacion: seccion Task Template
- estado: done

### S0-T3 - Armar backlog inicial por historia

- story_id: S0
- owner: ops
- prioridad: Critical
- objetivo: definir tareas ejecutables por fase con criterio verificable.
- resultado_esperado: backlog completo S0 + P0..P4.
- archivos_impactados: `TASKS.md`
- dependencias: S0-T2
- riesgo: medio
- criterio_aceptacion:
  - cada fase contiene tasks accionables y no ambiguas
  - cada task tiene owner, dependencias y evidencia requerida
- evidencia_requerida:
  - tests: N/A
  - logs/metricas: N/A
  - documentacion: seccion Backlog Priorizado completa
- estado: done

### S0-T4 - Mapear dependencias criticas

- story_id: S0
- owner: ops
- prioridad: High
- objetivo: evitar bloqueos de ejecucion y re-trabajo.
- resultado_esperado: dependencia explicita entre tasks.
- archivos_impactados: `TASKS.md`
- dependencias: S0-T3
- riesgo: medio
- criterio_aceptacion:
  - tasks bloqueantes identificadas
  - no hay task implementable sin prerequisitos
- evidencia_requerida:
  - tests: N/A
  - logs/metricas: N/A
  - documentacion: seccion Dependency Map
- estado: done

### S0-T5 - Priorizar por riesgo/impacto

- story_id: S0
- owner: ops
- prioridad: High
- objetivo: ordenar ejecucion para reducir riesgo temprano.
- resultado_esperado: secuencia priorizada Critical/High/Medium/Low.
- archivos_impactados: `TASKS.md`
- dependencias: S0-T4
- riesgo: bajo
- criterio_aceptacion:
  - prioridades explicitas por task
  - seguridad webhook por delante de async y datos
- evidencia_requerida:
  - tests: N/A
  - logs/metricas: N/A
  - documentacion: seccion Priority Execution Queue
- estado: done

### S0-T6 - Definir DoR / DoD

- story_id: S0
- owner: ops
- prioridad: High
- objetivo: establecer reglas de entrada/salida por task.
- resultado_esperado: criterio objetivo para empezar y cerrar work items.
- archivos_impactados: `TASKS.md`
- dependencias: S0-T5
- riesgo: bajo
- criterio_aceptacion:
  - DoR y DoD definidos y aplicables a todas las fases
- evidencia_requerida:
  - tests: N/A
  - logs/metricas: N/A
  - documentacion: seccion DoR and DoD
- estado: done

### S0-T7 - Definir tracking dual

- story_id: S0
- owner: ops
- prioridad: High
- objetivo: mantener plan y ejecucion sincronizados.
- resultado_esperado: regla operativa clara de sincronizacion.
- archivos_impactados: `TASKS.md`
- dependencias: S0-T6
- riesgo: bajo
- criterio_aceptacion:
  - fuente de verdad por tipo de informacion definida
  - frecuencia de sincronizacion definida
- evidencia_requerida:
  - tests: N/A
  - logs/metricas: N/A
  - documentacion: seccion Dual Tracking Rules
- estado: done (sin tests automatizados aún)

### P0 - Security Hardening Tasks

### P0-T1 - Validar secret token del webhook

- story_id: P0
- owner: app
- prioridad: Critical
- objetivo: aceptar solo updates autenticos desde Telegram.
- resultado_esperado: rechazo de requests sin token valido.
- archivos_impactados: `lambda/handler/telegram-webhook.handler.ts`, `lib/telegram-bot-gastos-stack.ts`
- dependencias: S0-T7
- riesgo: alto
- criterio_aceptacion:
  - webhook valida `X-Telegram-Bot-Api-Secret-Token`
  - tests de caso valido e invalido
- evidencia_requerida:
  - tests: unit tests del handler
  - logs/metricas: metrica de request invalida
  - documentacion: README actualizada
- estado: done (sin tests automatizados aún)

### P0-T2 - Restringir endpoint a POST-only

- story_id: P0
- owner: infra
- prioridad: High
- objetivo: reducir superficie de ataque.
- resultado_esperado: solo metodo POST expuesto para webhook.
- archivos_impactados: `lib/telegram-bot-gastos-stack.ts`, `lambda/utils/http.utils.ts`
- dependencias: P0-T1
- riesgo: medio
- criterio_aceptacion:
  - API Gateway expone solo POST para webhook
  - respuestas HTTP coherentes para metodos invalidos
- evidencia_requerida:
  - tests: integration test API method
  - logs/metricas: 4XX por metodo invalido
  - documentacion: README actualizada
- estado: done (sin tests automatizados aún)

### P0-T3 - Sanitizar logging de payload

- story_id: P0
- owner: app
- prioridad: High
- objetivo: evitar PII en logs.
- resultado_esperado: logs estructurados sin payload completo.
- archivos_impactados: `lambda/handler/telegram-webhook.handler.ts`
- dependencias: P0-T2
- riesgo: medio
- criterio_aceptacion:
  - no se loggea body completo del webhook
  - correlacion por request id/update id se mantiene
- evidencia_requerida:
  - tests: unit tests de logger helper (si aplica)
  - logs/metricas: sample logs revisados
  - documentacion: guideline de logging en README
- estado: done (sin tests automatizados aún)

### P0-T4 - Rate limiting base y alarma de rechazos

- story_id: P0
- owner: infra
- prioridad: Medium
- objetivo: limitar abuso y detectar ataques.
- resultado_esperado: control de rate + alarma operativa inicial.
- archivos_impactados: `lib/telegram-bot-gastos-stack.ts`
- dependencias: P0-T3
- riesgo: medio
- criterio_aceptacion:
  - regla de rate limiting aplicada
  - alarma para pico de rechazos creada
- evidencia_requerida:
  - tests: N/A
  - logs/metricas: alarmas y metricas visibles
  - documentacion: runbook de ajuste de limite
- estado: done (sin tests automatizados aún)
- nota_decision_arquitectonica:
  - Se descarta WAF association por migración a HTTP API (no soportado directo).
  - Se adopta throttling nativo + alarmas CloudWatch como control P0.

### P1 - Async Core Tasks

### P1-T1 - Crear ingress lambda (ack rapido + enqueue)

- story_id: P1
- owner: app
- prioridad: Critical
- objetivo: desacoplar recepcion del procesamiento pesado.
- resultado_esperado: webhook responde 200 rapido y encola update.
- archivos_impactados: `lambda/handler/*`, `lambda/index.ts`, `lib/telegram-bot-gastos-stack.ts`
- dependencias: P0-T4
- riesgo: alto
- criterio_aceptacion:
  - ack promedio sub-segundo en path normal
  - mensaje SQS contiene contrato minimo versionado
- evidencia_requerida:
  - tests: unit tests de payload contract
  - logs/metricas: metrica enqueue success/failure
  - documentacion: contrato de evento
- estado: done (sin tests automatizados aún)

### P1-T2 - Crear SQS principal + DLQ

- story_id: P1
- owner: infra
- prioridad: Critical
- objetivo: resiliencia de procesamiento y reintentos controlados.
- resultado_esperado: cola principal con DLQ y redrive configurado.
- archivos_impactados: `lib/telegram-bot-gastos-stack.ts`
- dependencias: P1-T1
- riesgo: alto
- criterio_aceptacion:
  - existe redrive policy valida
  - retention/visibility alineados a timeout de worker
- evidencia_requerida:
  - tests: cdk synth checks
  - logs/metricas: age of oldest message + DLQ metrics
  - documentacion: parametros de cola explicados
- estado: done (sin tests automatizados aún)

### P1-T3 - Implementar worker lambda con retries parciales

- story_id: P1
- owner: app
- prioridad: Critical
- objetivo: procesar updates de SQS con manejo robusto de errores.
- resultado_esperado: procesamiento idempotente con partial batch failures.
- archivos_impactados: `lambda/commands/*`, `lambda/db/*`, `lambda/telegram/*`, `lib/telegram-bot-gastos-stack.ts`
- dependencias: P1-T2
- riesgo: alto
- criterio_aceptacion:
  - worker retorna `batchItemFailures` cuando corresponda
  - duplicados de update no generan doble persistencia
- evidencia_requerida:
  - tests: unit tests worker + idempotencia
  - logs/metricas: errores por item y retries
  - documentacion: estrategia de retries
- estado: done (sin tests automatizados aún)

### P1-T4 - Runbook de reproceso DLQ

- story_id: P1
- owner: ops
- prioridad: High
- objetivo: permitir recuperacion operativa de fallos.
- resultado_esperado: procedimiento claro de replay y diagnostico.
- archivos_impactados: `README.md`
- dependencias: P1-T3
- riesgo: medio
- criterio_aceptacion:
  - runbook incluye pasos, validaciones y riesgos
  - incluye criterio para replay parcial o total
- evidencia_requerida:
  - tests: N/A
  - logs/metricas: N/A
  - documentacion: seccion DLQ runbook
- estado: done (sin tests automatizados aún)

### P2 - Data Model Optimization Tasks

### P2-T1 - Diseñar esquema de agregados mensuales

- story_id: P2
- owner: app
- prioridad: Critical
- objetivo: eliminar patron de consultas por dia.
- resultado_esperado: modelo de agregados por `chatId#YYYY-MM` y rubro.
- archivos_impactados: `lambda/db/gasto.entity.ts`, `lambda/db/gasto.repo.ts`
- dependencias: P1-T4
- riesgo: alto
- criterio_aceptacion:
  - esquema permite resumen mensual O(1) o cercano
  - claves y acceso quedan documentados
- evidencia_requerida:
  - tests: unit tests de repositorio
  - logs/metricas: comparativa RCU antes/despues
  - documentacion: data model section
- estado: done (sin tests automatizados aún)

### P2-T2 - Actualizar worker para mantener agregados idempotentes

- story_id: P2
- owner: app
- prioridad: High
- objetivo: consistencia de agregados sin doble conteo.
- resultado_esperado: update atomico o condicional de agregados.
- archivos_impactados: `lambda/db/*`, `lambda/commands/*`
- dependencias: P2-T1
- riesgo: alto
- criterio_aceptacion:
  - reintentos no duplican totales
  - manejo de concurrencia documentado
- evidencia_requerida:
  - tests: casos de idempotencia y concurrencia
  - logs/metricas: contador de conflictos/reintentos
  - documentacion: notas de consistencia
- estado: done (sin tests automatizados aún)

### P2-T3 - Migrar resumen/listado a paths optimizados

- story_id: P2
- owner: app
- prioridad: High
- objetivo: reducir latencia y costo en consultas mensuales.
- resultado_esperado: comandos usan agregados y/o lecturas optimizadas.
- archivos_impactados: `lambda/commands/resumen-mes.command.ts`, `lambda/commands/gastos-mes.command.ts`, `lambda/db/gasto.repo.ts`
- dependencias: P2-T2
- riesgo: medio
- criterio_aceptacion:
  - no hay loop de 28-31 queries para resumen mensual
  - comportamiento funcional se mantiene
- evidencia_requerida:
  - tests: regresion funcional comandos
  - logs/metricas: p95 de consulta menor al baseline
  - documentacion: README actualizada
- estado: done(sin tests automatizados aún)

### P2-T4 - Medir mejora de latencia y consumo

- story_id: P2
- owner: qa
- prioridad: Medium
- objetivo: verificar beneficio real del rediseño.
- resultado_esperado: benchmark antes/despues.
- archivos_impactados: `README.md`
- dependencias: P2-T3
- riesgo: bajo
- criterio_aceptacion:
  - reporte de latencia y consumo incluido
  - resultados trazables a escenarios definidos
- evidencia_requerida:
  - tests: benchmark reproducible
  - logs/metricas: tablas de comparacion
  - documentacion: resultados en README
- estado: done

### P3 - Observability and Cost Tasks

### P3-T1 - Alarmas criticas de plataforma

- story_id: P3
- owner: infra
- prioridad: High
- objetivo: deteccion temprana de degradacion.
- resultado_esperado: alarmas para errores, throttles, DLQ, queue age.
- archivos_impactados: `lib/telegram-bot-gastos-stack.ts`
- dependencias: P2-T4
- riesgo: medio
- criterio_aceptacion:
  - alarmas clave desplegadas
  - umbrales iniciales documentados
- evidencia_requerida:
  - tests: cdk synth assertions
  - logs/metricas: alarm list
  - documentacion: runbook alarmas
- estado: todo

### P3-T2 - Dashboard operativo minimo

- story_id: P3
- owner: infra
- prioridad: Medium
- objetivo: visibilidad centralizada del sistema.
- resultado_esperado: dashboard con ingress, queue, worker y errores Telegram API.
- archivos_impactados: `lib/telegram-bot-gastos-stack.ts`
- dependencias: P3-T1
- riesgo: bajo
- criterio_aceptacion:
  - dashboard contiene widgets minimos acordados
- evidencia_requerida:
  - tests: N/A
  - logs/metricas: dashboard screenshot/definition
  - documentacion: uso del dashboard
- estado: todo

### P3-T3 - Politica de retencion de logs por ambiente

- story_id: P3
- owner: infra
- prioridad: Medium
- objetivo: controlar costo y cumplimiento basico.
- resultado_esperado: retencion explicita y coherente por ambiente.
- archivos_impactados: `lib/telegram-bot-gastos-stack.ts`
- dependencias: P3-T2
- riesgo: bajo
- criterio_aceptacion:
  - log retention definida explicitamente
  - parametros por ambiente documentados
- evidencia_requerida:
  - tests: cdk synth review
  - logs/metricas: N/A
  - documentacion: politica de retencion
- estado: todo

### P3-T4 - Rightsizing y revision de costo API

- story_id: P3
- owner: ops
- prioridad: Medium
- objetivo: optimizar costo total de operacion.
- resultado_esperado: recomendacion aplicada de memoria/timeouts y API type.
- archivos_impactados: `lib/telegram-bot-gastos-stack.ts`, `README.md`
- dependencias: P3-T3
- riesgo: medio
- criterio_aceptacion:
  - propuesta de rightsizing respaldada por metricas
  - decision documentada sobre REST vs HTTP API
- evidencia_requerida:
  - tests: N/A
  - logs/metricas: baseline y resultado
  - documentacion: seccion cost optimization
- estado: todo

### P4 - Validation and Release Tasks

### P4-T1 - Integracion E2E del flujo async

- story_id: P4
- owner: qa
- prioridad: High
- objetivo: validar que el sistema funciona extremo a extremo.
- resultado_esperado: suite de pruebas E2E basicas para alta y consultas.
- archivos_impactados: `test/*`
- dependencias: P3-T4
- riesgo: medio
- criterio_aceptacion:
  - casos criticos cubiertos y pasando
  - evidencias de ejecucion guardadas
- evidencia_requerida:
  - tests: E2E suite
  - logs/metricas: reportes de test
  - documentacion: notas de test
- estado: todo

### P4-T2 - Prueba de carga controlada

- story_id: P4
- owner: qa
- prioridad: Medium
- objetivo: validar comportamiento bajo picos esperados.
- resultado_esperado: informe de estabilidad y limites operativos.
- archivos_impactados: `README.md`
- dependencias: P4-T1
- riesgo: medio
- criterio_aceptacion:
  - escenarios de carga definidos y ejecutados
  - umbrales de degradacion identificados
- evidencia_requerida:
  - tests: reporte de carga
  - logs/metricas: latencia/error rate bajo carga
  - documentacion: resultados de carga
- estado: todo

### P4-T3 - Plan de rollout/rollback

- story_id: P4
- owner: ops
- prioridad: High
- objetivo: asegurar release reversible y controlado.
- resultado_esperado: procedimiento de despliegue progresivo y rollback.
- archivos_impactados: `README.md`
- dependencias: P4-T2
- riesgo: medio
- criterio_aceptacion:
  - pasos de rollback probados en entorno de prueba
  - condiciones de go/no-go definidas
- evidencia_requerida:
  - tests: simulacion de rollback
  - logs/metricas: N/A
  - documentacion: runbook release
- estado: todo

### P4-T4 - Cierre documental y handoff

- story_id: P4
- owner: ops
- prioridad: Medium
- objetivo: dejar operacion sostenible post-implementacion.
- resultado_esperado: documentacion final y handoff completo.
- archivos_impactados: `README.md`, `TASKS.md`
- dependencias: P4-T3
- riesgo: bajo
- criterio_aceptacion:
  - documentacion final revisada
  - backlog actualizado a estado final por task
- evidencia_requerida:
  - tests: N/A
  - logs/metricas: N/A
  - documentacion: handoff checklist
- estado: todo

## Dependency Map

```mermaid
flowchart LR
  S0T1[S0_T1] --> S0T2[S0_T2]
  S0T2 --> S0T3[S0_T3]
  S0T3 --> S0T4[S0_T4]
  S0T4 --> S0T5[S0_T5]
  S0T5 --> S0T6[S0_T6]
  S0T6 --> S0T7[S0_T7]
  S0T7 --> P0T1[P0_T1]
  P0T1 --> P0T2[P0_T2]
  P0T2 --> P0T3[P0_T3]
  P0T3 --> P0T4[P0_T4]
  P0T4 --> P1T1[P1_T1]
  P1T1 --> P1T2[P1_T2]
  P1T2 --> P1T3[P1_T3]
  P1T3 --> P1T4[P1_T4]
  P1T4 --> P2T1[P2_T1]
  P2T1 --> P2T2[P2_T2]
  P2T2 --> P2T3[P2_T3]
  P2T3 --> P2T4[P2_T4]
  P2T4 --> P3T1[P3_T1]
  P3T1 --> P3T2[P3_T2]
  P3T2 --> P3T3[P3_T3]
  P3T3 --> P3T4[P3_T4]
  P3T4 --> P4T1[P4_T1]
  P4T1 --> P4T2[P4_T2]
  P4T2 --> P4T3[P4_T3]
  P4T3 --> P4T4[P4_T4]
```

## Priority Execution Queue

- **Critical**: S0-T1, S0-T2, S0-T3, P0-T1, P1-T1, P1-T2, P1-T3, P2-T1
- **High**: S0-T4, S0-T5, S0-T6, S0-T7, P0-T2, P0-T3, P1-T4, P2-T2, P2-T3, P3-T1, P4-T1, P4-T3
- **Medium**: P0-T4, P2-T4, P3-T2, P3-T3, P3-T4, P4-T2, P4-T4
- **Low**: N/A (por ahora)

## DoR and DoD

### Definition of Ready (DoR)

- objetivo y resultado esperado claros
- dependencias en `done` o plan de desbloqueo definido
- archivos impactados identificados
- criterio de aceptacion verificable
- evidencia requerida definida
- owner asignado

### Definition of Done (DoD)

- implementacion completa segun criterio de aceptacion
- pruebas ejecutadas y evidencia registrada
- documentacion actualizada cuando aplica
- task en estado `review` aprobada y movida a `done`
- impacto en observabilidad/operacion evaluado cuando aplica

## Dual Tracking Rules (Plan + TASKS.md)

- **Plan**: estrategia, fases, riesgos macro, dependencias de alto nivel.
- **TASKS.md**: ejecucion diaria, estado por task, evidencias y notas de cierre.
- **Sincronizacion**:
  - al cerrar una task: actualizar `TASKS.md` y luego reflejar avance en plan
  - al inicio de una fase: validar que predecesoras esten en `done`
  - por PR: incluir referencia a tasks movidas de estado

## Gate de salida de S0

S0 se considera completado cuando:

- S0-T1..S0-T7 estan en `done`
- backlog P0..P4 esta priorizado y con dependencias
- DoR/DoD y tracking dual estan definidos y aplicables
