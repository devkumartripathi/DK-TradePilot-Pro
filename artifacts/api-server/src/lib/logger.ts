/**
 * Minimal structured logger.
 * Avoids pulling in pino/winston to keep the bundle lean.
 */

type Level = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: Level;
  msg: string;
  ts: string;
  [key: string]: unknown;
}

function log(level: Level, ctx: object | string, msg?: string): void {
  const entry: LogEntry = {
    level,
    ts: new Date().toISOString(),
    msg: msg ?? (typeof ctx === "string" ? ctx : ""),
    ...(typeof ctx === "object" ? ctx : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error" || level === "warn") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export const logger = {
  debug: (ctx: object | string, msg?: string) => log("debug", ctx, msg),
  info:  (ctx: object | string, msg?: string) => log("info",  ctx, msg),
  warn:  (ctx: object | string, msg?: string) => log("warn",  ctx, msg),
  error: (ctx: object | string, msg?: string) => log("error", ctx, msg),
};
