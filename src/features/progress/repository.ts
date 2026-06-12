import { INITIAL_PLAYER_STATE, type PlayerState } from './types';

/**
 * Persistence boundary for player progress (ADR-0005). The learning loop only
 * talks to this interface; swapping localStorage for Supabase sync is a
 * provider change, not a feature rewrite.
 */
export interface ProgressRepository {
  load(): Promise<PlayerState>;
  save(state: PlayerState): Promise<void>;
}

const STORAGE_KEY = 'keymaster.progress.v1';

export class LocalProgressRepository implements ProgressRepository {
  async load(): Promise<PlayerState> {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return INITIAL_PLAYER_STATE;
      const parsed = JSON.parse(raw) as PlayerState;
      // Versioned schema: future shape changes migrate here instead of
      // silently corrupting (only v1 exists today).
      if (parsed.version !== 1) return INITIAL_PLAYER_STATE;
      return parsed;
    } catch {
      return INITIAL_PLAYER_STATE;
    }
  }

  async save(state: PlayerState): Promise<void> {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

/** Test/SSR double — also handy for Storybook-style isolated rendering. */
export class InMemoryProgressRepository implements ProgressRepository {
  constructor(private state: PlayerState = INITIAL_PLAYER_STATE) {}

  async load(): Promise<PlayerState> {
    return this.state;
  }

  async save(state: PlayerState): Promise<void> {
    this.state = state;
  }
}
