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

| Servicio | Propósito |
|---|---|
| API Gateway | Endpoint de webhook |
| Lambda (Node.js 22) | Lógica del bot |
| DynamoDB | Persistencia de gastos |
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

| Comando | Descripción |
|---|---|
| `npm run build` | Compila TypeScript a `dist/` |
| `npm run clean` | Limpia `dist/` |
| `npm run watch` | Compilación en modo watch |
| `npm test` | Ejecuta tests unitarios |
| `npx cdk synth` | Sintetiza CloudFormation |
| `npx cdk diff` | Muestra diferencias con lo desplegado |
| `npx cdk deploy` | Despliega infraestructura |

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

| Variable | Descripción |
|---|---|
| `TABLE_NAME` | Tabla DynamoDB |
| `GSI_FECHA_NAME` | GSI por fecha |
| `GSI_RUBRO_NAME` | GSI por rubro |
| `TELEGRAM_BOT_TOKEN_PARAM_NAME` | Path SSM del token |

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

## Estado del proyecto

Proyecto funcional para registro y consulta mensual de gastos, con arquitectura modular en Lambda y despliegue reproducible con CDK. La base es estable para evolucionar hacia reportes avanzados, configuración externa y mayor hardening de seguridad.
