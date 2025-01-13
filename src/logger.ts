import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const commonTransports = [
  new transports.Console(),
  new DailyRotateFile({
    filename: './logs/error-%DATE%.log',   
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',            
    maxFiles: '14d',                       
    zippedArchive: true,                   
    format: format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.json()
    ),
  }),
];

const combinedTransport = new DailyRotateFile({
  filename: './logs/combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  level: 'debug',
  maxSize: '20m',
  maxFiles: '14d',
  zippedArchive: true,
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
});

const resultstransporter = new DailyRotateFile({
  filename: './logs/results-%DATE%.log',    
  datePattern: 'YYYY-MM-DD',
  level: 'info',
  maxSize: '20m',
  maxFiles: '14d',
  zippedArchive: true,
  format: format.combine(
    format.timestamp(),
    format.metadata(),
    format.json()
  ),
});


export const logger = createLogger({
  transports: [...commonTransports, combinedTransport],
});

export const resultsLogger = createLogger({
  transports: [...commonTransports, resultstransporter],
});

