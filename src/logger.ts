import {
  createLogger as createWinstonLogger,
  format,
  Logger,
  transports,
} from 'winston';

function createLogger(level: string) {
  return createWinstonLogger({
    level,
    format: format.combine(
      format.errors({ stack: true }),
      format.metadata(),
      format.timestamp(),
      format.json(),
    ),
    exitOnError: false,
    transports: [
      new transports.Console(),
    ],
  });
}

export { Logger, createLogger };