import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'path'
import { promises as fs } from 'fs'
import {
  loadAdapters,
  saveAdapters,
  findAdapterForDomain,
  addAdapter,
} from '../../lib/adapter-store'
import type { Adapter, AdapterStore } from '../../lib/adapter-types'

const testStorePath = path.join(__dirname, '../../adapters/test-site-adapters.json')

describe('AdapterStore', () => {
  beforeEach(async () => {
    // Create a fresh test store for each test
    const emptyStore: AdapterStore = { version: '1.0', adapters: [] }
    await fs.writeFile(testStorePath, JSON.stringify(emptyStore, null, 2))
  })

  afterEach(async () => {
    // Clean up test file
    try {
      await fs.unlink(testStorePath)
    } catch {
      // File might not exist
    }
  })

  it('should load adapters from storage file', async () => {
    const testAdapter: Adapter = {
      id: 'test-adapter-1',
      domains: ['example.com'],
      strategy: 'selector',
      selector: 'a[href*=".pdf"]',
      confidence: 0.95,
      dateAdded: new Date().toISOString(),
      description: 'Test adapter',
    }

    const store: AdapterStore = { version: '1.0', adapters: [testAdapter] }
    await fs.writeFile(testStorePath, JSON.stringify(store, null, 2))

    const loadedStore = await loadAdapters(testStorePath)
    expect(loadedStore.adapters).toHaveLength(1)
    expect(loadedStore.adapters[0].id).toBe('test-adapter-1')
  })

  it('should save adapters to storage file', async () => {
    const adapter: Adapter = {
      id: 'test-adapter-2',
      domains: ['test.com'],
      strategy: 'pattern',
      pattern: '/downloads/.*\\.pdf',
      confidence: 0.88,
      dateAdded: new Date().toISOString(),
    }

    const store: AdapterStore = { version: '1.0', adapters: [adapter] }
    await saveAdapters(store, testStorePath)

    const loaded = await loadAdapters(testStorePath)
    expect(loaded.adapters).toHaveLength(1)
    expect(loaded.adapters[0].id).toBe('test-adapter-2')
  })

  it('should find adapter by domain', async () => {
    const adapter1: Adapter = {
      id: 'adapter-1',
      domains: ['greencoloring.com', 'example.com'],
      strategy: 'selector',
      selector: 'a.pdf-link',
      confidence: 0.92,
      dateAdded: new Date().toISOString(),
    }

    const adapter2: Adapter = {
      id: 'adapter-2',
      domains: ['coloring-pages.com'],
      strategy: 'pattern',
      pattern: '/pdf/.*',
      confidence: 0.85,
      dateAdded: new Date().toISOString(),
    }

    const store: AdapterStore = { version: '1.0', adapters: [adapter1, adapter2] }
    await saveAdapters(store, testStorePath)

    const found = await findAdapterForDomain('greencoloring.com', testStorePath)
    expect(found).toBeDefined()
    expect(found?.id).toBe('adapter-1')
  })

  it('should return undefined when no adapter found for domain', async () => {
    const store: AdapterStore = { version: '1.0', adapters: [] }
    await saveAdapters(store, testStorePath)

    const found = await findAdapterForDomain('unknown.com', testStorePath)
    expect(found).toBeUndefined()
  })

  it('should add adapter to store and persist', async () => {
    const newAdapter: Adapter = {
      id: 'new-adapter',
      domains: ['newsite.com'],
      strategy: 'javascript',
      confidence: 0.9,
      dateAdded: new Date().toISOString(),
      description: 'New adapter',
    }

    await addAdapter(newAdapter, testStorePath)

    const loaded = await loadAdapters(testStorePath)
    expect(loaded.adapters).toHaveLength(1)
    expect(loaded.adapters[0].id).toBe('new-adapter')
  })

  it('should handle missing file by creating empty store', async () => {
    const nonExistentPath = path.join(__dirname, '../../adapters/nonexistent.json')

    // Clean up if it exists
    try {
      await fs.unlink(nonExistentPath)
    } catch {
      // File doesn't exist, that's fine
    }

    const store = await loadAdapters(nonExistentPath)
    expect(store.version).toBe('1.0')
    expect(store.adapters).toHaveLength(0)
  })

  it('should maintain adapter order in storage', async () => {
    const adapters: Adapter[] = [
      {
        id: 'first',
        domains: ['first.com'],
        strategy: 'selector',
        selector: 'a',
        confidence: 0.9,
        dateAdded: '2026-01-01T00:00:00Z',
      },
      {
        id: 'second',
        domains: ['second.com'],
        strategy: 'pattern',
        pattern: '.*',
        confidence: 0.8,
        dateAdded: '2026-01-02T00:00:00Z',
      },
    ]

    const store: AdapterStore = { version: '1.0', adapters }
    await saveAdapters(store, testStorePath)

    const loaded = await loadAdapters(testStorePath)
    expect(loaded.adapters[0].id).toBe('first')
    expect(loaded.adapters[1].id).toBe('second')
  })
})
