export const LogLevel = {
  OFF: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  TRACE: 5,
};

export const Log = {
  level: LogLevel.INFO,

  error(...message: any[]) {
    if (this.level >= LogLevel.ERROR) {
      console.error(...message);
    }
  },

  info(...message: any[]) {
    if (this.level >= LogLevel.INFO) {
      console.log(...message);
    }
  },

  warn(...message: any[]) {
    if (this.level >= LogLevel.WARN) {
      console.warn(...message);
    }
  },

  debug(...message: any[]) {
    if (this.level >= LogLevel.DEBUG) {
      console.log(...message);
    }
  },

  trace(...message: any[]) {
    if (this.level >= LogLevel.TRACE) {
      console.log(...message);
    }
  },
};
