import pino from "pino";
import { AsyncLocalStorage } from "async_hooks";

// Request context storage
export const requestContext = new AsyncLocalStorage<{
  requestId: string;
  startTime: number;
}>();

// Base logger - for service lifecycle events (no request context)
// Note: Avoid using `transport` option as it spawns worker threads
// that conflict with Next.js Turbopack bundling
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: "desk",
    env: process.env.NODE_ENV,
  },
});

// Request logger - automatically includes requestId from AsyncLocalStorage
export function getLogger() {
  const context = requestContext.getStore();
  if (!context) {
    return logger; // Fallback to base logger
  }
  return logger.child({
    requestId: context.requestId,
  });
}

// Wrap handler with request context
export function withRequestContext<T>(
  requestId: string,
  handler: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  return requestContext.run({ requestId, startTime }, async () => {
    const log = getLogger();
    log.debug("Request started");

    try {
      const result = await handler();
      log.debug({ latencyMs: Date.now() - startTime }, "Request completed");
      return result;
    } catch (error) {
      log.error({ error, latencyMs: Date.now() - startTime }, "Request failed");
      throw error;
    }
  });
}
