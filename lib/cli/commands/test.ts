import inquirer from 'inquirer'
import axios from 'axios'
import { getAllAdapters } from '../../adapter-store'
import { parse } from 'node-html-parser'

export async function testCommand(): Promise<void> {
  console.log('\n🧪 Test Adapter\n')

  const adapters = await getAllAdapters()

  if (adapters.length === 0) {
    console.log('No adapters stored yet.\n')
    return
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'adapterId',
      message: 'Select an adapter to test:',
      choices: adapters.map(a => ({
        name: `${a.id} (${a.domains[0]})`,
        value: a.id,
      })),
    },
    {
      type: 'input',
      name: 'testUrl',
      message: 'Enter URL to test the adapter on:',
      validate: (input: string) => {
        try {
          new URL(input)
          return true
        } catch {
          return 'Please enter a valid URL'
        }
      },
    },
  ])

  const adapter = adapters.find(a => a.id === answers.adapterId)
  const testUrl = answers.testUrl as string

  if (!adapter) {
    console.log('Adapter not found.\n')
    return
  }

  console.log(`\n⏳ Testing adapter on ${testUrl}...\n`)

  try {
    const response = await axios.get(testUrl, { timeout: 30000 })
    const html = response.data
    const root = parse(html)

    let foundUrls: string[] = []

    if (adapter.strategy === 'selector' && adapter.selector) {
      const elements = root.querySelectorAll(adapter.selector)
      for (const element of elements) {
        const href = element.getAttribute('href') || element.getAttribute('data-pdf-url')
        if (href) {
          foundUrls.push(href)
        }
      }
    } else if (adapter.strategy === 'pattern' && adapter.pattern) {
      const pattern = new RegExp(adapter.pattern, 'g')
      const textContent = html.replace(/<[^>]*>/g, ' ')
      const matches = textContent.match(pattern) || []
      foundUrls = matches
    }

    console.log(`✅ Test Results:`)
    console.log(`   Found ${foundUrls.length} PDF URL(s)`)

    if (foundUrls.length > 0) {
      console.log(`   URLs:`)
      for (const url of foundUrls.slice(0, 5)) {
        console.log(`   - ${url}`)
      }
      if (foundUrls.length > 5) {
        console.log(`   ... and ${foundUrls.length - 5} more`)
      }
    }
    console.log()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`\n❌ Test failed: ${message}\n`)
  }
}
