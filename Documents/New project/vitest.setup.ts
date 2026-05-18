// Fix: Node.js 25 has a native localStorage stub that lacks standard Storage methods.
// Vitest's jsdom environment doesn't override it because it's already present in global.
// We replace it with a proper in-memory Storage implementation here.

class InMemoryStorage implements Storage {
  private _store: Record<string, string> = {}

  get length(): number {
    return Object.keys(this._store).length
  }

  key(index: number): string | null {
    return Object.keys(this._store)[index] ?? null
  }

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this._store, key)
      ? this._store[key]
      : null
  }

  setItem(key: string, value: string): void {
    this._store[key] = String(value)
  }

  removeItem(key: string): void {
    delete this._store[key]
  }

  clear(): void {
    this._store = {}
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new InMemoryStorage(),
  writable: true,
  configurable: true,
})

Object.defineProperty(globalThis, 'sessionStorage', {
  value: new InMemoryStorage(),
  writable: true,
  configurable: true,
})
