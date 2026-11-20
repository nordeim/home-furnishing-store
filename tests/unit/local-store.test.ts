import { afterEach, describe, expect, it, vi } from "vitest";

// The module is new (F-2): import AFTER the localStorage shim in setup.ts exists.
// Red first — this suite defines the contract before the implementation lands.
import { createLocalStore, PERSISTED_STORAGE_KEYS } from "@/lib/local-store";
import fs from "node:fs";
import path from "node:path";
import { isValidCartPayload, isValidWishPayload, isValidPromoPayload } from "@/lib/cart-store";

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

  // Task 122 F-3: the Task-121 validators were container-shallow —
  // Array.isArray([null]) is true, so a poisoned nordhem_cart_v1 of [null]
  // still crashed CartProvider's lines.reduce and [42] NaN'd every total.
  // The payload validators must check ELEMENTS, not just the container.
  describe("cart/wishlist element validation (Task 122 F-3)", () => {
    const validLine = {
      productId: 1,
      slug: "solbakken-3-seat-sofa",
      name: "SOLBAKKEN 3-seat sofa",
      sku: "NH-1001",
      imageUrl: "https://images.pexels.com/photos/1/p.jpg",
      unitPriceCents: 79900,
      qty: 2,
    };

    it("still rejects wrong-container payloads (the F-4 contract holds)", () => {
      expect(isValidCartPayload({ lines: [] })).toBe(false);
      expect(isValidCartPayload("nope")).toBe(false);
      expect(isValidCartPayload(null)).toBe(false);
    });

    it("rejects arrays with junk elements — the [null]/[42] crash class", () => {
      expect(isValidCartPayload([null])).toBe(false);
      expect(isValidCartPayload([42])).toBe(false);
      expect(isValidCartPayload(["x"])).toBe(false);
    });

    it("rejects partial lines (missing required fields)", () => {
      expect(isValidCartPayload([{ productId: 1 }])).toBe(false);
      expect(isValidCartPayload([{ ...validLine, unitPriceCents: undefined }])).toBe(false);
      expect(isValidCartPayload([{}])).toBe(false);
    });

    it("rejects out-of-contract field values (qty floor/ceiling, types)", () => {
      expect(isValidCartPayload([{ ...validLine, qty: 0 }])).toBe(false);
      expect(isValidCartPayload([{ ...validLine, qty: 100 }])).toBe(false);
      expect(isValidCartPayload([{ ...validLine, qty: 1.5 }])).toBe(false);
      expect(isValidCartPayload([{ ...validLine, productId: 0 }])).toBe(false);
      expect(isValidCartPayload([{ ...validLine, productId: 1.5 }])).toBe(false);
      expect(isValidCartPayload([{ ...validLine, unitPriceCents: "100" }])).toBe(false);
      expect(isValidCartPayload([{ ...validLine, unitPriceCents: -1 }])).toBe(false);
      expect(isValidCartPayload([{ ...validLine, name: 5 }])).toBe(false);
    });

    it("rejects DUPLICATE entries (Task 133 F-3 — the shape→element→uniqueness chain's third layer)", () => {
      // A crafted nordhem_wish_v1 of ["slug","slug"] passed the element
      // predicate (every element a string) while /api/products returns
      // unique slugs — items.length 1 < wishlist.length 2 made the page
      // render the FALSE "1 saved item is no longer available." above the
      // available product's card. The cart sibling: a duplicated valid line
      // produced duplicate React keys and a doubled subtotal display. A
      // duplicate payload degrades to the fallback (the [null] precedent —
      // the honest empty state, never a false note).
      expect(isValidWishPayload(["a", "a"])).toBe(false);
      expect(isValidWishPayload(["a", "b", "a"])).toBe(false);
      expect(isValidWishPayload(["a", "b"])).toBe(true);
      expect(isValidCartPayload([validLine, validLine])).toBe(false);
      expect(isValidCartPayload([validLine, { ...validLine, qty: 1 }])).toBe(false);
      // Distinct productIds stay valid (the existing :168 pair's contract).
      expect(isValidCartPayload([validLine, { ...validLine, productId: 2, qty: 1 }])).toBe(true);
    });

    it("accepts empty and well-formed payloads (validation is not rejection)", () => {
      expect(isValidCartPayload([])).toBe(true);
      expect(isValidCartPayload([validLine])).toBe(true);
      expect(isValidCartPayload([validLine, { ...validLine, productId: 2, qty: 1 }])).toBe(true);
    });

    it("a persisted [null] cart degrades to [] through the store contract", () => {
      const k = key();
      localStorage.setItem(k, JSON.stringify([null]));
      const s = createLocalStore<unknown[]>(k, [], isValidCartPayload);
      expect(s.getSnapshot()).toEqual([]);
    });

    it("a persisted [null] wishlist degrades to [] (the wish validator checks elements)", () => {
      const k = key();
      localStorage.setItem(k, JSON.stringify([null]));
      const s = createLocalStore<string[]>(k, [], isValidWishPayload);
      expect(s.getSnapshot()).toEqual([]);
    });

    it("the wishlist validator rejects non-string elements and non-arrays", () => {
      expect(isValidWishPayload([42])).toBe(false);
      expect(isValidWishPayload(["a", 3])).toBe(false);
      expect(isValidWishPayload("a")).toBe(false);
      expect(isValidWishPayload(["a"])).toBe(true);
      expect(isValidWishPayload([])).toBe(true);
    });
  });

  // Task 134 F-4: addLine's found-branch clamped only its ceiling — a
  // programmatic add(line, -5) on an existing line stored a negative qty
  // (in-memory negative badge/subtotal until reload, where the load-time
  // predicate degrades the payload). No UI path passes a negative qty
  // (BuyBox/ProductCard pass >= 1), so this is hardening — but the found
  // branch must carry the same Math.max(1, ...) floor its new-line sibling
  // has had since the store shipped. addLine is module-internal (not an
  // exportable pure seam), so the pin is the fs-scan — the
  // server-data.test.ts fulfilment-seam precedent.
  describe("addLine qty clamping (Task 134 F-4)", () => {
    it("BOTH addLine branches clamp at the floor and the ceiling (fs-pin)", () => {
      const src = fs.readFileSync(path.resolve(import.meta.dirname, "../../src/lib/cart-store.tsx"), "utf8");
      // The new-line branch (the original form):
      expect(src, "the new-line branch keeps its floor+ceiling clamp").toContain("qty: Math.min(99, Math.max(1, qty))");
      // The found-branch (Task 134 F-4 — pre-fix it read Math.min(99, l.qty + qty)):
      expect(src, "the found-branch clamps at the floor too").toContain("qty: Math.min(99, Math.max(1, l.qty + qty))");
      // The unclamped found-branch form must be gone entirely.
      expect(src, "the unclamped found-branch form is retired").not.toContain("Math.min(99, l.qty + qty)");
    });
  });
});


// Task 123 F-13: the promo store accepted any string — a crafted 10k-char
// nordhem_promo loaded into the store and rode to checkout until the
// server's 32-char cap refused it. The persisted-state predicate now mirrors
// the write boundary (promoCode <= 32).
describe("promo payload validation (Task 123 F-13)", () => {
  it("accepts null and codes within the write-boundary cap", () => {
    expect(isValidPromoPayload(null)).toBe(true);
    expect(isValidPromoPayload("WELCOME10")).toBe(true);
    expect(isValidPromoPayload("A".repeat(32))).toBe(true);
  });

  it("rejects non-strings and over-cap codes (the checkout boundary cap mirrored)", () => {
    expect(isValidPromoPayload(5)).toBe(false);
    expect(isValidPromoPayload({})).toBe(false);
    expect(isValidPromoPayload("A".repeat(33))).toBe(false);
  });

  it("a persisted over-cap promo degrades to null through the store contract", () => {
    const k = key();
    localStorage.setItem(k, JSON.stringify("X".repeat(40)));
    const s = createLocalStore<string | null>(k, null, isValidPromoPayload);
    expect(s.getSnapshot()).toBeNull();
  });
});

/**
 * Task 126 F-6: the crash boundaries must consume the shared
 * PERSISTED_STORAGE_KEYS list (fs-pin — GREEN-on-arrival, the invariant IS
 * the deliverable): a fifth persisted store added to the list heals both
 * recovery buttons at once, and a literal key array in a boundary is the
 * drift this seam exists to kill.
 */
describe("PERSISTED_STORAGE_KEYS seam (Task 126 F-6)", () => {
  it("lists exactly the four persisted keys", () => {
    expect([...PERSISTED_STORAGE_KEYS]).toEqual([
      "nordhem_cart_v1",
      "nordhem_wish_v1",
      "nordhem_promo",
      "nordhem_store",
    ]);
  });

  it("both crash boundaries import the shared list, not literal key arrays", () => {
    const read = (p: string) => fs.readFileSync(path.resolve(import.meta.dirname, "../../", p), "utf8");
    for (const boundary of ["src/app/error.tsx", "src/app/global-error.tsx"]) {
      const src = read(boundary);
      expect(src, boundary).toContain("PERSISTED_STORAGE_KEYS");
      expect(src, boundary).not.toContain('"nordhem_cart_v1"');
    }
  });

  it("every createLocalStore key in src/ is a member of the list (Task 128 F-12)", () => {
    // Task 126 F-6 pinned the CONSUMERS (the boundaries); this pins the
    // PRODUCERS — a fifth persisted store created with a new key (literal or
    // constant) without adding it to PERSISTED_STORAGE_KEYS leaves the
    // recovery buttons partially ineffective with no failing test. The
    // seam's "by construction" claim is now actually enforced (the
    // SITE_ORIGIN fs-pin precedent).
    // Task 129 F-6: the scan covers EVERY .ts/.tsx file under src/ (recursive)
    // — the original two-file producers list let a call site added to any
    // other file escape the pin with the test green.
    const read = (p: string) => fs.readFileSync(path.resolve(import.meta.dirname, "../../", p), "utf8");
    const srcDir = path.resolve(import.meta.dirname, "../../src");
    const producers: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts")) producers.push(path.relative(path.resolve(import.meta.dirname, "../.."), full));
      }
    };
    walk(srcDir);
    // First arg is either a literal or a module const defined in the same file
    // (cart-store: const CART_KEY = "nordhem_cart_v1").
    // Task 133 F-6c: the scan is FAIL-CLOSED. The pre-133 pattern silently
    // SKIPPED a call whose first argument was anything else (template
    // literal, lowercase const, expression) — the call didn't match, minted
    // didn't increment, and a store minted that way escaped
    // PERSISTED_STORAGE_KEYS with the pin green (the Task-132 F-2
    // presence-only class one layer up). Now EVERY call site must match the
    // conforming pattern; a non-conforming first arg fails by name.
    const callRe = /createLocalStore(?:<[^>]*>)?\(\s*("[^"]+"|[A-Z][A-Z0-9_]*)/g;
    // Calls only — the DEFINITION in local-store.ts ("function createLocalStore(")
    // is not a mint and must not count toward callCount (negative lookbehind).
    const anyCallRe = /(?<!function )createLocalStore(?:<[^>]*>)?\(/g;
    let minted = 0;
    const nonconforming: string[] = [];
    for (const producer of producers) {
      const src = read(producer);
      const args = [...src.matchAll(callRe)].map((m) => m[1]);
      minted += args.length;
      const callCount = [...src.matchAll(anyCallRe)].length;
      if (args.length !== callCount) {
        // Some call's first argument is not a literal or UPPER_CASE const —
        // pin it by locating each non-matching call's argument text.
        const allArgs = [...src.matchAll(/(?<!function )createLocalStore(?:<[^>]*>)?\(\s*([^,)\n]+)/g)].map((m) => m[1].trim());
        for (const a of allArgs) {
          if (!/^("[^"]+"|[A-Z][A-Z0-9_]*)$/.test(a)) nonconforming.push(`${producer}: ${a}`);
        }
      }
      for (const arg of args) {
        const key = arg.startsWith('"')
          ? arg.slice(1, -1)
          : src.match(new RegExp(`const ${arg} = "([^"]+)"`))?.[1];
        expect(key, `${producer} first arg ${arg} resolves to a key literal`).toBeDefined();
        expect(PERSISTED_STORAGE_KEYS, `${producer} key "${key}"`).toContain(key);
      }
    }
    expect(nonconforming, "every createLocalStore call must name its key as a literal or UPPER_CASE const (fail-closed scan — a computed key escapes PERSISTED_STORAGE_KEYS)").toEqual([]);
    // The known producers today: cart-store.tsx (3 constant-keyed stores) +
    // Header.tsx (1 literal-keyed store). The floor catches a scan that
    // silently matches nothing (a regex regression would zero it).
    expect(minted, "src/ mints the known four persisted stores").toBeGreaterThanOrEqual(4);
  });
});
