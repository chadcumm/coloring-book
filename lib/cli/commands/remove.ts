import inquirer from 'inquirer'
import { getAllAdapters, removeAdapter } from '../../adapter-store'

export async function removeCommand(): Promise<void> {
  console.log('\n🗑️  Remove Adapter\n')

  const adapters = await getAllAdapters()

  if (adapters.length === 0) {
    console.log('No adapters stored yet.\n')
    return
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'adapterId',
      message: 'Select an adapter to remove:',
      choices: adapters.map(a => ({
        name: `${a.id} (${a.domains[0]})`,
        value: a.id,
      })),
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure you want to remove this adapter?',
      default: false,
    },
  ])

  if (!answers.confirm) {
    console.log('Cancelled.\n')
    return
  }

  const success = await removeAdapter(answers.adapterId as string)

  if (success) {
    console.log(`✅ Adapter removed.\n`)
  } else {
    console.log(`❌ Adapter not found.\n`)
  }
}
