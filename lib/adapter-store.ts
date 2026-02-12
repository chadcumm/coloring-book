import { promises as fs } from 'fs'
import path from 'path'
import type { Adapter, AdapterStore } from './adapter-types'

const DEFAULT_STORE_PATH = path.join(process.cwd(), 'adapters', 'site-adapters.json')

/**
 * Load adapters from storage file
 * Creates empty store if file doesn't exist
 */
export async function loadAdapters(storePath: string = DEFAULT_STORE_PATH): Promise<AdapterStore> {
  try {
    const content = await fs.readFile(storePath, 'utf-8')
    const store = JSON.parse(content) as AdapterStore
    return store
  } catch (error) {
    // File doesn't exist or is invalid, return empty store
    console.warn(`Warning: Could not load adapters from ${storePath}, using empty store`)
    return { version: '1.0', adapters: [] }
  }
}

/**
 * Save adapters to storage file
 */
export async function saveAdapters(
  store: AdapterStore,
  storePath: string = DEFAULT_STORE_PATH
): Promise<void> {
  const dir = path.dirname(storePath)

  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true })

  // Write file with pretty formatting
  await fs.writeFile(storePath, JSON.stringify(store, null, 2) + '\n')
}

/**
 * Find adapter for a given domain
 * Returns the adapter with highest confidence that matches the domain
 */
export async function findAdapterForDomain(
  domain: string,
  storePath: string = DEFAULT_STORE_PATH
): Promise<Adapter | undefined> {
  const store = await loadAdapters(storePath)

  // Extract base domain (remove www., subdomains)
  const baseDomain = domain.replace(/^www\./, '').split('.').slice(-2).join('.')

  // Find adapters that match this domain
  const matching = store.adapters.filter(adapter =>
    adapter.domains.some(d => {
      const adapterBaseDomain = d.replace(/^www\./, '').split('.').slice(-2).join('.')
      return adapterBaseDomain === baseDomain || d === domain
    })
  )

  // Return adapter with highest confidence
  return matching.sort((a, b) => b.confidence - a.confidence)[0]
}

/**
 * Add a new adapter to storage
 */
export async function addAdapter(
  adapter: Adapter,
  storePath: string = DEFAULT_STORE_PATH
): Promise<void> {
  const store = await loadAdapters(storePath)

  // Check if adapter with this ID already exists
  const existingIndex = store.adapters.findIndex(a => a.id === adapter.id)

  if (existingIndex >= 0) {
    // Update existing adapter
    store.adapters[existingIndex] = adapter
  } else {
    // Add new adapter
    store.adapters.push(adapter)
  }

  await saveAdapters(store, storePath)
}

/**
 * Remove adapter by ID
 */
export async function removeAdapter(
  adapterId: string,
  storePath: string = DEFAULT_STORE_PATH
): Promise<boolean> {
  const store = await loadAdapters(storePath)
  const initialLength = store.adapters.length

  store.adapters = store.adapters.filter(a => a.id !== adapterId)

  if (store.adapters.length < initialLength) {
    await saveAdapters(store, storePath)
    return true
  }

  return false
}

/**
 * Get all adapters
 */
export async function getAllAdapters(
  storePath: string = DEFAULT_STORE_PATH
): Promise<Adapter[]> {
  const store = await loadAdapters(storePath)
  return store.adapters
}

/**
 * Clear all adapters (use with caution)
 */
export async function clearAllAdapters(
  storePath: string = DEFAULT_STORE_PATH
): Promise<void> {
  const emptyStore: AdapterStore = { version: '1.0', adapters: [] }
  await saveAdapters(emptyStore, storePath)
}
