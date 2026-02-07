import { getAllAdapters } from '../../adapter-store'

export async function listCommand(): Promise<void> {
  console.log('\n📋 Stored Adapters\n')

  const adapters = await getAllAdapters()

  if (adapters.length === 0) {
    console.log('No adapters stored yet. Run "npm run discover-adapter" to add one.\n')
    return
  }

  console.log(`Found ${adapters.length} adapter(s):\n`)

  for (const adapter of adapters) {
    console.log(`📍 ${adapter.id}`)
    console.log(`   Domain(s): ${adapter.domains.join(', ')}`)
    console.log(`   Strategy: ${adapter.strategy}`)
    console.log(`   Confidence: ${(adapter.confidence * 100).toFixed(1)}%`)
    if (adapter.description) {
      console.log(`   Description: ${adapter.description}`)
    }
    console.log(`   Added: ${new Date(adapter.dateAdded).toLocaleDateString()}`)
    console.log()
  }
}
