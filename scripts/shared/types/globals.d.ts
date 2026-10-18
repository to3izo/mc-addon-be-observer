// Globals provided by the Minecraft script runtime that are not part of the
// ECMAScript standard library. Keep this file minimal and runtime-accurate.

declare const console: {
  log(...data: unknown[]): void;
  info(...data: unknown[]): void;
  warn(...data: unknown[]): void;
  error(...data: unknown[]): void;
};
