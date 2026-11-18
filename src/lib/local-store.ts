/**
 * A tiny localStorage-backed external store for useSyncExternalStore.
 *
 * Why this exists: the React Compiler-era `react-hooks/set-state-in-effect`
 * lint rule flags the previous "hydrate from localStorage inside an effect"
 * pattern (setState in effect body → cascading renders). The compliant
 * pattern is useSyncExternalStore with a server snapshot — React then
 * re-renders with client data after hydration without any effect-setState.
 *
 * Contract (pinned by tests/unit/local-store.test.ts):
 * - `getSnapshot()` — current value; parses persisted JSON, falls back to the
 *   initial value on corrupt/missing data or on a payload of the wrong SHAPE
 *   (Task 121 F-4: `JSON.parse` only rejects invalid JSON — a valid-JSON
 *   `{"lines":[]}` in an array store used to become the snapshot and crash
 *   CartProvider's `lines.reduce` mid-render, taking every route down).
 *   Never throws.
 * - `getServerSnapshot()` — always the fallback (SSR truth; no localStorage
 *   on the server).
 * - `subscribe(cb)` — cb(value) on every set(); returns an unsubscribe fn.
 * - `set(next | updater)` — persists JSON best-effort (quota/private-mode
 *   failures degrade to memory-only) and notifies subscribers.
 */

type Listener<T> = (value: T) => void;

export interface LocalStore<T> {
  key(): string;
  getSnapshot(): T;
  getServerSnapshot(): T;
  subscribe(listener: Listener<T>): () => void;
  set(next: T | ((prev: T) => T)): void;
}

function safeStorage(): Storage | null {
  try {
    // Browsers expose localStorage on window; the server runtime has none.
    // Reading via globalThis covers both (and test shims) without a window check.
    const s = (globalThis as { localStorage?: Storage }).localStorage;
    return s ?? null;
  } catch {
    return null; // storage access can throw in some privacy modes
  }
}

export function createLocalStore<T>(
  key: string,
  fallback: T,
  validate?: (value: unknown) => boolean,
): LocalStore<T> {
  let value: T = fallback;
  const listeners = new Set<Listener<T>>();

  const storage = safeStorage();
  if (storage) {
    try {
      const raw = storage.getItem(key);
      if (raw != null) {
        const parsed: unknown = JSON.parse(raw);
        // Wrong-shape valid JSON is as unusable as corrupt JSON — a validator
        // (or a validator bug) degrades to the fallback instead of poisoning
        // the snapshot that every consumer renders from.
        if (!validate || validate(parsed)) value = parsed as T;
      }
    } catch {
      // Corrupt or unreadable payload — degrade to the fallback.
    }
  }

  return {
    key: () => key,
    getSnapshot: () => value,
    getServerSnapshot: () => fallback,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(next) {
      value = typeof next === "function" ? (next as (prev: T) => T)(value) : next;
      if (storage) {
        try {
          storage.setItem(key, JSON.stringify(value));
        } catch {
          // Quota exceeded / private mode — in-memory state still updates.
        }
      }
      for (const l of listeners) l(value);
    },
  };
}
