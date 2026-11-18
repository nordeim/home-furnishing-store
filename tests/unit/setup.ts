// Unit-suite setup: a minimal in-memory localStorage shim (node env has none)
// plus the env contract guard. Tests that touch localStorage-backed stores
// rely on this shim; it implements only the surface the app uses.
declare global {
  var localStorage: Storage;
}

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  key(index: number) {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value));
  }
}

globalThis.localStorage = new MemoryStorage() as Storage;

// The db module (imported transitively by some route modules) fails fast at
// module load without DATABASE_URL — pin a harmless dev value for the suite.
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

export {};
