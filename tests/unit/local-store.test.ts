import { afterEach, describe, expect, it, vi } from "vitest";

// The module is new (F-2): import AFTER the localStorage shim in setup.ts exists.
// Red first — this suite defines the contract before the implementation lands.
import { createLocalStore } from "@/lib/local-store";

function key() {
  return `nordhem_test_${Math.random().toString(36).slice(2, 8)}`;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createLocalStore (localStorage-backed external store)", () => {
  it("returns the fallback before anything is written", () => {
    const s = createLocalStore<number[]>(key(), []);
    expect(s.getSnapshot()).toEqual([]);
  });

  it("set() updates the snapshot and persists JSON to localStorage", () => {
    const s = createLocalStore<number[]>(key(), []);
    s.set([1, 2, 3]);
    expect(s.getSnapshot()).toEqual([1, 2, 3]);
    expect(JSON.parse(localStorage.getItem(s.key())!)).toEqual([1, 2, 3]);
  });

  it("a second store on the same key reads the persisted value", () => {
    const k = key();
    const a = createLocalStore<string>(k, "none");
    a.set("hello");
    const b = createLocalStore<string>(k, "none");
    expect(b.getSnapshot()).toBe("hello");
  });

  it("set() with an updater receives the current snapshot", () => {
    const s = createLocalStore<number[]>(key(), []);
    s.set([1]);
    s.set((prev) => [...prev, 2]);
    expect(s.getSnapshot()).toEqual([1, 2]);
  });

  it("notifies subscribers on set() and stops on unsubscribe", () => {
    const s = createLocalStore<number>(key(), 0);
    const seen: number[] = [];
    const unsub = s.subscribe((v) => seen.push(v));
    s.set(1);
    s.set(2);
    unsub();
    s.set(3);
    expect(seen).toEqual([1, 2]);
    expect(s.getSnapshot()).toBe(3);
  });

  it("corrupt persisted JSON degrades to the fallback instead of throwing", () => {
    const k = key();
    localStorage.setItem(k, "{not json");
    const s = createLocalStore<{ a: number }>(k, { a: 1 });
    expect(s.getSnapshot()).toEqual({ a: 1 });
  });

  it("survives localStorage write failures (quota/private-mode) without throwing", () => {
    const s = createLocalStore<number>(key(), 0);
    const orig = localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => s.set(42)).not.toThrow();
    expect(s.getSnapshot()).toBe(42); // state still updates in memory
    (localStorage.setItem as ReturnType<typeof vi.spyOn>).mockRestore();
    void orig;
  });

  it("getServerSnapshot always returns the fallback (SSR truth)", () => {
    const k = key();
    const s = createLocalStore<number>(k, 0);
    s.set(9);
    expect(s.getServerSnapshot()).toBe(0);
  });

  // Task 121 F-4: JSON.parse only rejects INVALID JSON — a valid-JSON payload
  // of the WRONG SHAPE ({"lines":[]} in an array store, "5" in a string store)
  // used to become the snapshot and crash consumers mid-render (CartProvider's
  // lines.reduce) — taking every route down with it, since the provider wraps
  // the root layout. A validate predicate must degrade those to the fallback.
  describe("shape validation (Task 121 F-4)", () => {
    it("a valid-JSON wrong-shape cart payload degrades to the fallback", () => {
      const k = key();
      localStorage.setItem(k, JSON.stringify({ lines: [] }));
      const s = createLocalStore<Array<{ productId: number }>>(k, [], Array.isArray);
      expect(s.getSnapshot()).toEqual([]);
    });

    it("a valid-JSON non-string promo payload degrades to the fallback", () => {
      const k = key();
      localStorage.setItem(k, JSON.stringify(5));
      const s = createLocalStore<string | null>(k, null, (v): v is string | null => v === null || typeof v === "string");
      expect(s.getSnapshot()).toBeNull();
    });

    it("a shape-valid persisted value still loads (validation is not rejection)", () => {
      const k = key();
      localStorage.setItem(k, JSON.stringify([{ productId: 3 }, { productId: 8 }]));
      const s = createLocalStore<Array<{ productId: number }>>(k, [], Array.isArray);
      expect(s.getSnapshot()).toEqual([{ productId: 3 }, { productId: 8 }]);
    });

    it("a validator that throws degrades to the fallback, never crashes the read", () => {
      const k = key();
      localStorage.setItem(k, JSON.stringify("anything"));
      const s = createLocalStore<string>(k, "safe", () => {
        throw new Error("validator bug");
      });
      expect(s.getSnapshot()).toBe("safe");
    });
  });
});
