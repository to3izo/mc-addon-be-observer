/**
 * A feature is a self-contained unit of gameplay logic (see scripts/features/).
 * Each feature registers its own event subscriptions in `register()`.
 */
export interface Feature {
  /** Short, unique, kebab-case id used in logs. */
  readonly id: string;
  /** Called once at script load. Subscribe to events here. */
  register(): void;
}
