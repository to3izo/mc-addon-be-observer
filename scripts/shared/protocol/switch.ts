/**
 * An on/off switch per name, kept in memory only (ADR-0014, ADR-0015). Every name starts off; /reload and a server
 * restart start a new switch. Results are always in the order of the names given to the constructor.
 */
export class NameSwitch<T extends string> {
  private readonly names: readonly T[];
  private readonly on = new Set<T>();

  constructor(names: readonly T[]) {
    this.names = names;
  }

  isOn(name: T): boolean {
    return this.on.has(name);
  }

  /** The names that are on. */
  enabled(): T[] {
    return this.names.filter((name) => this.on.has(name));
  }

  /** Turns names on and off and returns the names whose state changed. */
  apply(enable: readonly T[], disable: readonly T[]): T[] {
    const changed = new Set<T>();
    for (const name of enable) {
      if (!this.on.has(name)) {
        this.on.add(name);
        changed.add(name);
      }
    }
    for (const name of disable) {
      if (this.on.delete(name)) changed.add(name);
    }
    return this.names.filter((name) => changed.has(name));
  }
}
