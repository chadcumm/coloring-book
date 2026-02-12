import inquirer from 'inquirer'
import { getAllAdapters } from '../../adapter-store'

export async function viewCommand(): Promise<void> {
  console.log('\n📖 View Adapter Details\n')

  const adapters = await getAllAdapters()

  if (adapters.length === 0) {
    console.log('No adapters stored yet.\n')
    return
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'adapterId',
      message: 'Select an adapter to view:',
      choices: adapters.map(a => ({
        name: `${a.id} (${a.domains[0]})`,
        value: a.id,
      })),
    },
  ])

  const adapter = adapters.find(a => a.id === answers.adapterId)

  if (!adapter) {
    console.log('Adapter not found.\n')
    return
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`Adapter: ${adapter.id}`)
  console.log(`${'='.repeat(50)}`)
  console.log(`Domain(s):   ${adapter.domains.join(', ')}`)
  console.log(`Strategy:    ${adapter.strategy}`)
  console.log(`Confidence:  ${(adapter.confidence * 100).toFixed(1)}%`)
  console.log(`Added:       ${new Date(adapter.dateAdded).toLocaleDateString()}`)
  if (adapter.description) {
    console.log(`Description: ${adapter.description}`)
  }
  if (adapter.selector) {
    console.log(`Selector:    ${adapter.selector}`)
  }
  if (adapter.pattern) {
    console.log(`Pattern:     ${adapter.pattern}`)
  }
  console.log(`${'='.repeat(50)}\n`)
}
