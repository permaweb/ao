import debug from "debug";
import { tap } from "ramda";

export const createLogger = (name = "@permaweb/ao-sdk") => {
  const logger = debug(name);

  logger.child = (name) => createLogger(`${logger.namespace}:${name}`);
  logger.tap = (note) => tap((...args) => logger(note, ...args));

  return logger;
};
