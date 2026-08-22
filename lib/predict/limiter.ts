/**
 * Sliding-window rate limiter.
 *
 * The documented ceiling is 240 req/min. We run at half that: the brief's
 * instruction was "I'd rather it be slow than get me throttled", and a throttle
 * mid-sync costs more than the latency we save by crowding the limit.
 *
 * Deliberately a module-level singleton so every caller shares one window.
 * Under Next's bundling a module can be instantiated more than once (Server
 * Components and Route Handlers are separate bundles), which would silently
 * double the effective rate — so the state is parked on globalThis.
 */
const MAX_PER_MINUTE = 120;
const WINDOW_MS = 60_000;

type LimiterState = { times: number[]; chain: Promise<void> };

const g = globalThis as unknown as { __predictLimiter?: LimiterState };
const state: LimiterState = (g.__predictLimiter ??= {
  times: [],
  chain: Promise.resolve(),
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Serialised so concurrent callers cannot each see a stale window and race. */
export function throttle<T>(task: () => Promise<T>): Promise<T> {
  const run = state.chain.then(async () => {
    for (;;) {
      const now = Date.now();
      state.times = state.times.filter((t) => now - t < WINDOW_MS);
      if (state.times.length < MAX_PER_MINUTE) {
        state.times.push(now);
        return;
      }
      await sleep(WINDOW_MS - (now - state.times[0]) + 10);
    }
  });
  // The chain must not break on a failed task, or every later call rejects.
  state.chain = run.catch(() => {});
  return run.then(task);
}
