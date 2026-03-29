// src/utils/logger.ts

const logLevels = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

let currentLogLevel = logLevels.INFO;

export const setLogLevel = (level: keyof typeof logLevels) => {
  currentLogLevel = logLevels[level];
};

const formatMessage = (level: string, message: string, ...args: any[]) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}`;
};

export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (currentLogLevel <= logLevels.DEBUG) {
      console.debug(formatMessage('DEBUG', message, ...args));
    }
  },
  info: (message: string, ...args: any[]) => {
    if (currentLogLevel <= logLevels.INFO) {
      console.info(formatMessage('INFO', message, ...args));
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (currentLogLevel <= logLevels.WARN) {
      console.warn(formatMessage('WARN', message, ...args));
    }
  },
  error: (message: string, ...args: any[]) => {
    if (currentLogLevel <= logLevels.ERROR) {
      console.error(formatMessage('ERROR', message, ...args));
    }
  },
};

export const measurePerformance = (label: string, callback: () => void) => {
  const start = performance.now();
  callback();
  const end = performance.now();
  logger.info(`Performance [${label}]: ${end - start}ms`);
};

export default logger;