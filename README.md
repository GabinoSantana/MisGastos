# telegram-bot-gastos

Bot de Telegram para registrar gastos diarios por chat y consultar resultados mensuales de forma simple, rápida y sin depender de una app móvil.

## Contexto del proyecto

Este proyecto nace para resolver una necesidad concreta: registrar gastos personales o de un grupo directamente desde Telegram, en el momento en que ocurren, con un formato mínimo y sin fricción.

La idea principal es reemplazar planillas manuales o notas dispersas por una interfaz que ya se usa todos los días (Telegram), manteniendo la operación en infraestructura serverless de bajo mantenimiento.

## Objetivo del proyecto

El objetivo es ofrecer un bot confiable para:

- capturar gastos con un formato consistente;
- consultar resumen mensual por rubro;
- listar todos los movimientos de un mes;
- mantener trazabilidad básica de quién envió cada registro;
- operar con costos acotados y despliegue reproducible en AWS.

## Alcance actual

### Incluye

- Registro de gasto desde Telegram en formato `DD/MM, Monto, Rubro, Descripción`.
- Comando `resumen mes` para ver total y desglose por rubro.
- Comando `gastos mes` con mes actual o mes explícito (`YYYY-MM` / `YYYY/MM`).
- Paginación automática de respuestas largas para respetar límite de Telegram (4096 caracteres).
- Persistencia en DynamoDB con acceso por índices (fecha y rubro).
- Despliegue completo mediante AWS CDK.

### No incluye (por ahora)

- UI web o app móvil.
- Multi-moneda o conversiones de tipo de cambio.
- Presupuestos por categoría con alertas automáticas.
- Reportería avanzada (CSV/PDF) o dashboards.

## Arquitectura funcional

```text
Usuario (Telegram)
   -> Webhook (API Gateway)
   -> Lambda (parsea comando y ejecuta caso de uso)
   -> DynamoDB (guarda/consulta)
   -> Telegram API (respuesta al usuario)
```

### Servicios AWS usados

| Servicio            | Propósito                       |
| ------------------- | ------------------------------- |
| API Gateway         | Endpoint de webhook             |
| Lambda (Node.js 22) | Lógica del bot                  |
| DynamoDB            | Persistencia de gastos          |
| SSM Parameter Store | Token del bot como SecureString |

## Flujo de uso

1. El usuario envía un mensaje al bot.
2. Telegram llama al webhook.
3. La Lambda identifica el comando:
   - `create_gasto`
   - `resumen_mes`
   - `gastos_mes`
4. La Lambda persiste/consulta en DynamoDB.
5. El bot responde al chat con el resultado formateado.

## Comandos disponibles

### 1) Registrar gasto

Entrada:

```text
DD/MM, Monto, Rubro, Descripción
```

Ejemplo:

```text
18/02, 1250, Comida, Almuerzo con clientes
```

### 2) Resumen mensual

```text
resumen mes
```

### 3) Listado completo del mes

Mes actual:

```text
gastos mes
```

Mes explícito:

```text
gastos mes 2026-02
gastos mes 2026/02
```

Formato de salida:

```text
DD/MM/YYYY - monto - rubroNormalizado - descripcion
```

## Requisitos técnicos

- Node.js >= 22
- AWS CLI configurado
- AWS CDK v2
- `cdk bootstrap` ejecutado en la cuenta/región objetivo
- Parámetro SSM existente: `/telegram-bot-gastos/telegram-token` (SecureString)

## Instalación

```bash
npm install
cd lambda && npm install && cd ..
```

## Scripts principales

| Comando          | Descripción                           |
| ---------------- | ------------------------------------- |
| `npm run build`  | Compila TypeScript a `dist/`          |
| `npm run clean`  | Limpia `dist/`                        |
| `npm run watch`  | Compilación en modo watch             |
| `npm test`       | Ejecuta tests unitarios               |
| `npx cdk synth`  | Sintetiza CloudFormation              |
| `npx cdk diff`   | Muestra diferencias con lo desplegado |
| `npx cdk deploy` | Despliega infraestructura             |

## Despliegue y webhook

1. Deploy:

```bash
npx cdk deploy
```

2. Tomar `CFNApiUrl` del output.
3. Configurar webhook en Telegram:

```text
https://api.telegram.org/bot<TOKEN>/setWebhook?url=<CFNApiUrl>/telegram-gastos-bot
```

## Variables de entorno (Lambda)

Se inyectan desde CDK:

| Variable                        | Descripción                                            |
| ------------------------------- | ------------------------------------------------------ |
| `TABLE_NAME`                    | Tabla DynamoDB                                         |
| `GSI_FECHA_NAME`                | GSI por fecha                                          |
| `GSI_RUBRO_NAME`                | GSI por rubro                                          |
| `TELEGRAM_BOT_TOKEN_PARAM_NAME` | Path SSM del token                                     |
| `SHARED_SUMMARY_CHAT_IDS`       | Lista CSV de chat IDs que comparten resumen (opcional) |

Configurar `SHARED_SUMMARY_CHAT_IDS` en deploy (sin hardcode en código):

```bash
npx cdk deploy -c sharedSummaryChatIds=123,456
```

## Estructura del código

```text
bin/                 entrypoint CDK
lib/                 definición de infraestructura
lambda/
  handler/           entrypoint HTTP y orquestación
  commands/          casos de uso por comando
  domain/            parseo y reglas de entrada
  db/                entidad/repositorio de DynamoDB
  telegram/          cliente Telegram y lectura de token
  formatting/        formateo de respuestas
  utils/             helpers transversales
test/lambda/         tests unitarios de parser, formatter y telegram client
```

## Calidad y pruebas

Ejecutar:

```bash
npm test
```

Cobertura actual enfocada en:

- parseo de comandos;
- formateo de mensajes;
- partición de mensajes largos.

## Seguridad (recomendado para producción)

El webhook debe ser público para Telegram, pero se recomienda:

- validar `X-Telegram-Bot-Api-Secret-Token`;
- usar path de webhook no predecible;
- exponer solo `POST` en el endpoint;
- agregar AWS WAF con rate limit.

## Runbook DLQ (P1-T4)

Este runbook aplica a la cola principal `telegram-gastos-ingress-queue` y su DLQ `telegram-gastos-ingress-dlq`.

### Objetivo

Recuperar mensajes fallidos de DLQ de forma controlada, minimizando riesgo de duplicados, loops de reintento y degradacion operativa.

### Senales para activar runbook

- aumento sostenido de mensajes en DLQ
- errores repetidos `worker_process_failure`
- crecimiento de `ApproximateAgeOfOldestMessage`

### Pre-checks obligatorios

1. Confirmar que la causa raiz esta mitigada.
2. Validar que el worker esta saludable (sin error rate anomalo reciente).
3. Confirmar capacidad operativa (concurrencia Lambda y backlog de cola principal).
4. Definir estrategia: replay parcial o replay total.

### Diagnostico rapido (CLI)

```bash
aws sqs get-queue-url --queue-name telegram-gastos-ingress-queue --region <REGION>
aws sqs get-queue-url --queue-name telegram-gastos-ingress-dlq --region <REGION>

aws sqs get-queue-attributes \
  --queue-url <DLQ_URL> \
  --attribute-names ApproximateNumberOfMessages ApproximateAgeOfOldestMessage RedrivePolicy \
  --region <REGION>

aws sqs receive-message \
  --queue-url <DLQ_URL> \
  --max-number-of-messages 10 \
  --visibility-timeout 30 \
  --message-attribute-names All \
  --attribute-names All \
  --region <REGION>
```

### Estrategia A: replay parcial (recomendada por defecto)

Usar cuando el fallo esta acotado y se quiere minimizar riesgo operativo.

1. Leer lote pequeno desde DLQ.
2. Re-enviar mensajes validos a cola principal.
3. Verificar procesamiento correcto en logs del worker.
4. Eliminar solo mensajes reprocesados de la DLQ.

```bash
aws sqs send-message \
  --queue-url <MAIN_QUEUE_URL> \
  --message-body '<MESSAGE_BODY_JSON>' \
  --message-attributes '<MESSAGE_ATTRIBUTES_JSON>' \
  --region <REGION>

aws sqs delete-message \
  --queue-url <DLQ_URL> \
  --receipt-handle '<RECEIPT_HANDLE>' \
  --region <REGION>
```

### Estrategia B: replay total (solo con causa sistemica resuelta)

Usar cuando la causa raiz fue corregida y se valida capacidad para absorber el volumen.

```bash
aws sqs get-queue-attributes \
  --queue-url <DLQ_URL> \
  --attribute-names QueueArn \
  --region <REGION>

aws sqs start-message-move-task \
  --source-arn <DLQ_ARN> \
  --region <REGION>

aws sqs list-message-move-tasks \
  --source-arn <DLQ_ARN> \
  --region <REGION>
```

### Riesgos y mitigaciones

- duplicados funcionales por replay/retry: mitigado por idempotencia por `updateId`
- poison messages: empezar por replay parcial y excluir payloads invalidos
- replay storm: usar lotes pequenos y monitoreo activo

### Validaciones post-replay

- la DLQ desciende como se espera
- `worker_process_failure` vuelve a baseline
- la cola principal drena sin acumulacion sostenida

### Criterio de cierre de incidente

- mensajes criticos reprocesados
- DLQ en nivel aceptable
- causa raiz y acciones preventivas documentadas

## Infrastructure Cost Estimation

Estimación mensual de costos para la infraestructura declarada en CDK en `lib/telegram-bot-gastos-stack.ts`, usando precios públicos on-demand en `us-east-1`, sin Free Tier.

### Recursos detectados en CDK

| Recurso CDK | Servicio AWS | Tipo de pricing |
| ----------- | ------------ | --------------- |
| `NodejsFunction` (`TelegramGastosBotLambda`) | AWS Lambda | Requests + Compute (GB-second) |
| `RestApi` (`TelegramGastosBotApiGateway`) | Amazon API Gateway (REST API) | API Calls (request-based, por tramos) |
| `Table` (`gastosTabla`, PAY_PER_REQUEST) + 2 GSI | Amazon DynamoDB | On-Demand Read Request Units + On-Demand Write Request Units + Storage (GB-Month) |
| Log group implícito de Lambda | Amazon CloudWatch Logs | Ingested Logs (GB) + Log Storage (GB-Month) |
| `StringParameter.fromSecureStringParameterAttributes` | SSM Parameter Store | Referencia a parámetro existente (no crea recurso nuevo en este stack) |

### Supuestos de carga

- Región: `us-east-1`.
- Modelo de precios: On-Demand público.
- Sin Free Tier (cuando el precio publicado incluye tramo gratis, se usa el tramo pago).
- Relación de tráfico:
  - 1 request a API Gateway = 1 invocación Lambda.
  - DynamoDB por request: `0.6` WRU y `1.8` RRU (promedio).
- Lambda:
  - Memoria: `512 MB` (definida en CDK).
  - Duración promedio: `300 ms` por invocación.
  - Cómputo por invocación: `0.5 GB * 0.3 s = 0.15 GB-s`.
- Logs:
  - Tráfico bajo: `2 GB` ingestados / `2 GB-Month` almacenados.
  - Tráfico medio: `20 GB` ingestados / `20 GB-Month` almacenados.
  - Tráfico alto: `200 GB` ingestados / `200 GB-Month` almacenados.
- Escenarios de requests/mes:
  - Bajo: `100,000`
  - Medio: `1,000,000`
  - Alto: `10,000,000`

### Precios unitarios (fuente MCP AWS Pricing)

| Servicio | Tipo | Precio unitario USD |
| -------- | ---- | ------------------- |
| AWS Lambda | Requests | `0.0000002000` por request |
| AWS Lambda | Compute (Tier-1) | `0.0000166667` por GB-second |
| Amazon API Gateway (REST API) | API calls (primer tramo hasta 333M req/mes) | `0.0000035000` por request |
| Amazon DynamoDB On-Demand | Write Request Unit | `0.0000006250` por WRU |
| Amazon DynamoDB On-Demand | Read Request Unit | `0.0000001250` por RRU |
| Amazon DynamoDB | Storage | `0.2500000000` por GB-Month (tramo pago) |
| Amazon CloudWatch Logs | Ingested logs | `0.5000000000` por GB |
| Amazon CloudWatch Logs | Log storage | `0.0300000000` por GB-Month |

### Costos mensuales por escenario

| Servicio | Tráfico bajo (USD) | Tráfico medio (USD) | Tráfico alto (USD) |
| -------- | ------------------:| -------------------:| ------------------:|
| API Gateway (REST API requests) | 0.35 | 3.50 | 35.00 |
| Lambda requests | 0.02 | 0.20 | 2.00 |
| Lambda compute | 0.25 | 2.50 | 25.00 |
| DynamoDB writes | 0.04 | 0.38 | 3.75 |
| DynamoDB reads | 0.02 | 0.23 | 2.25 |
| DynamoDB storage | 0.50 | 2.50 | 10.00 |
| CloudWatch Logs ingest | 1.00 | 10.00 | 100.00 |
| CloudWatch Logs storage | 0.06 | 0.60 | 6.00 |
| **Total mensual estimado** | **2.24** | **19.90** | **184.00** |

### Fuentes de cada precio (MCP y tipo)

- `AWSLambda`:
  - `group=AWS-Lambda-Requests`, `usagetype=Request`.
  - `group=AWS-Lambda-Duration`, `usagetype=Lambda-GB-Second`.
- `AmazonApiGateway`:
  - `operation=ApiGatewayRequest`, `usagetype=USE1-ApiGatewayRequest`.
- `AmazonDynamoDB`:
  - `group=DDB-WriteUnits`, `usagetype=WriteRequestUnits`, `operation=PayPerRequestThroughput`.
  - `group=DDB-ReadUnits`, `usagetype=ReadRequestUnits`, `operation=PayPerRequestThroughput`.
  - `productFamily=Database Storage`, `usagetype=TimedStorage-ByteHrs`, `volumeType=Amazon DynamoDB - Indexed DataStore`.
- `AmazonCloudWatch`:
  - `operation=PutLogEvents`, `usagetype=USE1-DataProcessing-Bytes`.
  - `usagetype=TimedStorage-ByteHrs` (log storage).

### Aclaraciones

- El stack referencia un parámetro SSM existente (`fromSecureStringParameterAttributes`), pero no crea ese recurso en CloudFormation.
- No se incluyeron costos de egress/data transfer a Internet ni costos externos a AWS (Telegram API), porque no están modelados explícitamente en este stack.
- Si querés, se puede agregar un cuarto escenario incluyendo egress (GB/mes) consultando `AWSDataTransfer` en el MCP.

## Estado del proyecto

Proyecto funcional para registro y consulta mensual de gastos, con arquitectura modular en Lambda y despliegue reproducible con CDK. La base es estable para evolucionar hacia reportes avanzados, configuración externa y mayor hardening de seguridad.
