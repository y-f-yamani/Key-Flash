import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProgressRepository } from './repository';
import { changedCardIds } from './sync';
import { INITIAL_PLAYER_STATE, type CardRecord, type PlayerState } from './types';

/**
 * Cloud persistence for signed-in users. Maps PlayerState onto the relational
 * schema (card_states, user_stats, daily_activity) with diff-based upserts so
 * a 60-second sprint doesn't rewrite the whole table. Personal bests ride on
 * user_stats-adjacent storage via arena_runs (Phase 2B) — until then they are
 * mirrored in localStorage by the caller.
 *
 * RLS note: all writes here run as the signed-in user and touch only their
 * own rows; ranked submissions go through the validated API route instead.
 */
export class SupabaseProgressRepository implements ProgressRepository {
  private lastSaved: PlayerState = INITIAL_PLAYER_STATE;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly userId: string,
  ) {}

  async load(): Promise<PlayerState> {
    const [stats, cards, activity] = await Promise.all([
      this.supabase.from('user_stats').select('*').eq('user_id', this.userId).maybeSingle(),
      this.supabase.from('card_states').select('*').eq('user_id', this.userId),
      this.supabase
        .from('daily_activity')
        .select('*')
        .eq('user_id', this.userId)
        .order('activity_date', { ascending: false })
        .limit(1),
    ]);

    const cardEntries: [string, CardRecord][] = (cards.data ?? []).map((row) => [
      row.shortcut_id as string,
      {
        ease: row.ease,
        intervalDays: row.interval_days,
        dueAt: new Date(row.due_at).getTime(),
        reps: row.reps,
        lapses: row.lapses,
        attempts: row.attempts,
        correct: row.correct,
        bestMs: row.best_ms,
        avgMs: row.avg_ms,
      },
    ]);

    const today = activity.data?.[0];
    const state: PlayerState = {
      version: 1,
      totalXp: stats.data?.total_xp ?? 0,
      streak: {
        current: stats.data?.current_streak ?? 0,
        longest: stats.data?.longest_streak ?? 0,
        lastActiveDate: stats.data?.last_active_date ?? null,
      },
      dailyGoalXp: today?.goal_xp ?? INITIAL_PLAYER_STATE.dailyGoalXp,
      today: today
        ? { dateKey: today.activity_date as string, xp: today.xp_earned as number }
        : INITIAL_PLAYER_STATE.today,
      cards: Object.fromEntries(cardEntries),
      // Bests are served from arena_runs once the runs API lands (Phase 2B);
      // until then the provider overlays them from local storage.
      bests: {},
    };

    this.lastSaved = state;
    return state;
  }

  async save(state: PlayerState): Promise<void> {
    const changed = changedCardIds(this.lastSaved, state);

    const writes: PromiseLike<unknown>[] = [];

    if (changed.length > 0) {
      const rows = changed.map((shortcutId) => {
        const card = state.cards[shortcutId];
        return {
          user_id: this.userId,
          shortcut_id: shortcutId,
          ease: card.ease,
          interval_days: card.intervalDays,
          due_at: new Date(card.dueAt).toISOString(),
          reps: card.reps,
          lapses: card.lapses,
          attempts: card.attempts,
          correct: card.correct,
          best_ms: card.bestMs,
          avg_ms: card.avgMs,
          updated_at: new Date().toISOString(),
        };
      });
      writes.push(this.supabase.from('card_states').upsert(rows));
    }

    if (
      state.totalXp !== this.lastSaved.totalXp ||
      state.streak !== this.lastSaved.streak
    ) {
      writes.push(
        this.supabase
          .from('user_stats')
          .update({
            total_xp: state.totalXp,
            current_streak: state.streak.current,
            longest_streak: state.streak.longest,
            last_active_date: state.streak.lastActiveDate,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', this.userId),
      );
    }

    if (state.today.dateKey && state.today !== this.lastSaved.today) {
      writes.push(
        this.supabase
          .from('daily_activity')
          .upsert({
            user_id: this.userId,
            activity_date: state.today.dateKey,
            xp_earned: state.today.xp,
            goal_xp: state.dailyGoalXp,
            goal_met: state.today.xp >= state.dailyGoalXp,
          }),
      );
    }

    await Promise.all(writes);
    this.lastSaved = state;
  }
}
