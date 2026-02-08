#!/usr/bin/env node

import { discoverCommand } from './cli/commands/discover'
import { listCommand } from './cli/commands/list'
import { viewCommand } from './cli/commands/view'
import { testCommand } from './cli/commands/test'
import { removeCommand } from './cli/commands/remove'
import inquirer from 'inquirer'

async function main() {
  const command = process.argv[2]

  if (command === 'discover') {
    await discoverCommand()
  } else if (command === 'list') {
    await listCommand()
  } else if (command === 'view') {
    await viewCommand()
  } else if (command === 'test') {
    await testCommand()
  } else if (command === 'remove') {
    await removeCommand()
  } else {
    // Show menu
    console.log('\n🎨 Coloring Book Adapter Discovery System\n')

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'command',
        message: 'What would you like to do?',
        choices: [
          { name: '🔍 Discover adapter for new website', value: 'discover' },
          { name: '📋 List all adapters', value: 'list' },
          { name: '📖 View adapter details', value: 'view' },
          { name: '🧪 Test adapter', value: 'test' },
          { name: '🗑️  Remove adapter', value: 'remove' },
          new inquirer.Separator(),
          { name: '❌ Exit', value: 'exit' },
        ],
      },
    ])

    if (answers.command !== 'exit') {
      process.argv[2] = answers.command
      await main()
    }
  }
}

main().catch(error => {
  console.error('Error:', error instanceof Error ? error.message : error)
  process.exit(1)
})

export { discoverCommand, listCommand, viewCommand, testCommand, removeCommand }
