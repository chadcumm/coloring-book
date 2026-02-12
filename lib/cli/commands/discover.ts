import inquirer from 'inquirer'
import { discoverAdapterWithReport } from '../../adapter-discovery-engine'
import { addAdapter } from '../../adapter-store'
import axios from 'axios'
import type { Adapter } from '../../adapter-types'

export async function discoverCommand(): Promise<void> {
  console.log('\n🔍 Website Adapter Discovery Tool\n')

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: 'Enter the website URL to discover:',
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

  const url = answers.url as string
  console.log(`\n⏳ Discovering adapter for ${url}...\n`)

  try {
    // Fetch the page content
    console.log('📥 Downloading page content...')
    const response = await axios.get(url, { timeout: 30000 })
    const html = response.data

    // Run discovery with all strategies
    console.log('🧪 Testing detection strategies...')
    const report = await discoverAdapterWithReport(html, url)

    // Display results
    console.log('\n📊 Discovery Results:\n')
    console.log(`Found ${report.results.length} strategy results:`)

    for (const result of report.results) {
      console.log(`\n  ${result.strategy.toUpperCase()}:`)
      console.log(`  - PDFs found: ${result.pdfUrls.length}`)
      console.log(`  - Confidence: ${(result.confidence * 100).toFixed(1)}%`)
      if (result.selector) {
        console.log(`  - Selector: ${result.selector}`)
      }
      if (result.pattern) {
        console.log(`  - Pattern: ${result.pattern}`)
      }
    }

    if (!report.bestResult) {
      console.log('\n❌ No PDFs found. Try another website.')
      return
    }

    console.log(`\n✅ Best result: ${report.bestResult.strategy.toUpperCase()}`)
    console.log(`   Confidence: ${(report.bestResult.confidence * 100).toFixed(1)}%`)
    console.log(`   PDFs: ${report.bestResult.pdfUrls.length}`)

    // Ask for confirmation
    const confirmAnswers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'save',
        message: 'Save this adapter?',
        default: true,
      },
    ])

    if (!confirmAnswers.save) {
      console.log('❌ Adapter not saved.')
      return
    }

    // Create adapter from discovery result
    const adapter: Adapter = {
      id: `adapter-${Date.now()}`,
      domains: [new URL(url).hostname],
      strategy: report.bestResult.strategy,
      selector: report.bestResult.selector,
      pattern: report.bestResult.pattern,
      confidence: report.bestResult.confidence,
      dateAdded: new Date().toISOString(),
      description: `Auto-discovered from ${new URL(url).hostname}`,
    }

    // Save to store
    await addAdapter(adapter)

    console.log(`\n✅ Adapter saved!`)
    console.log(`   ID: ${adapter.id}`)
    console.log(`   Domain: ${adapter.domains[0]}`)
    console.log(`   Strategy: ${adapter.strategy}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`\n❌ Discovery failed: ${message}`)
  }
}
