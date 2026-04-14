type LogMethod = 'debug' | 'info' | 'warn' | 'error';

const isProd = Boolean(
  typeof import.meta !== 'undefined' && import.meta.env?.PROD,
);

function safeConsole(method: LogMethod, ...args: unknown[]): void {
  const output = globalThis.console as Console | undefined;
  const consoleMethod = output?.[method];

  if (!consoleMethod) {
    return;
  }

  if (isProd && method !== 'warn' && method !== 'error') {
    return;
  }

  consoleMethod.apply(output, args);
}

export const logger = {
  debug: (...args: unknown[]) => safeConsole('debug', ...args),
  info: (...args: unknown[]) => safeConsole('info', ...args),
  warn: (...args: unknown[]) => safeConsole('warn', ...args),
  error: (...args: unknown[]) => safeConsole('error', ...args),
};
