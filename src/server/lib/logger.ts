import winston from 'winston';

const formatMeta = (meta) => {
  if (!meta || !Object.keys(meta).length) {
    return '';
  } else if (meta.stack) {
    // Errors provided as meta get turned into objects
    return `\n${meta.stack}`;
  } else {
    return ` | ${JSON.stringify(meta)}`;
  }
};

const logger = winston.createLogger({
  level: 'warn',
  format: winston.format.combine(
    winston.format.label({ label: 'el-toro' }),
    winston.format.timestamp(),
    winston.format.metadata({
      fillExcept: ['message', 'level', 'timestamp', 'label'],
    }),
    winston.format.colorize(),
    winston.format.printf((info) => {
      // eslint-disable-next-line max-len
      let out = `${info.timestamp} | PID ${global.process.pid} [${info.label}] ${info.level}: ${info.message}`;
      if (info.metadata.error) {
        out = out + ' ' + info.metadata.error;
        if (info.metadata.error.stack) {
          out = out + ' ' + info.metadata.error.stack;
        }
      }
      return out;
    }),
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
