const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: string, text: string): string => (useColor ? `\u001b[${code}m${text}\u001b[0m` : text);

export const log = {
  step(message: string): void {
    console.log(paint("36", "▸ ") + message);
  },
  info(message: string): void {
    console.log("  " + message);
  },
  ok(message: string): void {
    console.log(paint("32", "✔ ") + message);
  },
  warn(message: string): void {
    console.log(paint("33", "⚠ ") + message);
  },
  error(message: string): void {
    console.error(paint("31", "✖ ") + message);
  },
};

/** Collects validation problems so a run can report everything at once. */
export class Reporter {
  readonly errors: string[] = [];
  readonly warnings: string[] = [];

  error(message: string): void {
    this.errors.push(message);
  }

  warn(message: string): void {
    this.warnings.push(message);
  }

  get ok(): boolean {
    return this.errors.length === 0;
  }

  /** Prints every collected problem. Returns true when there are no errors. */
  print(): boolean {
    for (const w of this.warnings) log.warn(w);
    for (const e of this.errors) log.error(e);
    return this.ok;
  }
}
