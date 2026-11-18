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
});
