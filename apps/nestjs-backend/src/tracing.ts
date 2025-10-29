/* eslint-disable @typescript-eslint/naming-convention */
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ExpressInstrumentation, ExpressLayerType } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { resourceFromAttributes } from '@opentelemetry/resources';
import * as opentelemetry from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { PrismaInstrumentation } from '@prisma/instrumentation';

const parseOtelHeaders = (headerStr?: string) => {
  if (!headerStr) return {};
  return headerStr.split(',').reduce(
    (acc, curr) => {
      const [key, value] = curr.split('=');
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    },
    {} as Record<string, string>
  );
};

const headers = parseOtelHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);

const traceExporterOptions = {
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  headers: {
    'Content-Type': 'application/x-protobuf',
    ...headers,
  },
};

const traceExporter = traceExporterOptions.url
  ? new OTLPTraceExporter(traceExporterOptions)
  : undefined;

const logExporterOptions = {
  url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
  headers: {
    'Content-Type': 'application/x-protobuf',
    ...headers,
  },
};

const logExporter = logExporterOptions.url ? new OTLPLogExporter(logExporterOptions) : undefined;

const { SimpleLogRecordProcessor } = opentelemetry.logs;

const { ParentBasedSampler, TraceIdRatioBasedSampler } = opentelemetry.node;

const otelSDK = new opentelemetry.NodeSDK({
  traceExporter,
  logRecordProcessors: logExporter ? [new SimpleLogRecordProcessor(logExporter)] : [],
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(Number(process.env.OTEL_SAMPLER_RATIO) || 0.1),
  }),
  instrumentations: [
    new HttpInstrumentation({
      ignoreIncomingRequestHook: (request) => {
        const ignorePaths = [
          '/favicon.ico',
          '/_next/',
          '/__nextjs',
          '/images/',
          '/.well-known/',
          '/health',
        ];
        return ignorePaths.some((path) => request.url?.startsWith(path));
      },
      // 确保追踪 outgoing HTTP 请求（如 AI API 调用）
      ignoreOutgoingRequestHook: (_options) => {
        // 不忽略任何出站请求，这样可以追踪到 AI API 调用
        return false;
      },
      // 添加请求和响应钩子以获取更多信息
      requestHook: (span, request) => {
        // 为 AI API 请求添加特殊标记
        if (typeof request === 'object' && 'host' in request) {
          const host = request.host || '';
          if (
            host.includes('api.openai.com') ||
            host.includes('hash070.com') ||
            host.includes('opapi.win') ||
            host.includes('generativelanguage.googleapis.com')
          ) {
            span.setAttribute('ai.provider', 'detected');
          }
        }
      },
    }),
    new ExpressInstrumentation({
      ignoreLayersType: [ExpressLayerType.MIDDLEWARE, ExpressLayerType.REQUEST_HANDLER],
    }),
    new NestInstrumentation(),
    new PrismaInstrumentation(),
    new PinoInstrumentation(),
  ],
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'teable-dev',
    [ATTR_SERVICE_VERSION]: process.env.BUILD_VERSION,
  }),
});

export default otelSDK;

const shutdownHandler = () => {
  return otelSDK.shutdown().then(
    () => console.log('OTEL shut down successfully'),
    (err) => console.log('Error shutting down OTEL', err)
  );
};

// Handle both SIGTERM and SIGINT
process.on('SIGTERM', shutdownHandler);
process.on('SIGINT', shutdownHandler);
