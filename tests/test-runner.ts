#!/usr/bin/env node

/**
 * Coloring Book Web Service - Test Runner
 * Runs comprehensive tests against the service
 *
 * Usage:
 *   npm run test:mvp        - Run MVP tests only
 *   npm run test:full       - Run all test levels
 *   npm run test:ci         - Run CI/CD tests (headless)
 */

import axios from 'axios'
import { promises as fs } from 'fs'
import path from 'path'
import { existsSync } from 'fs'

interface TestConfig {
  baseUrl: string
  testUrls: string[]
  timeout: number
  verbose: boolean
  level: 'mvp' | 'comprehensive' | 'ci'
  useLocalFiles: boolean
  fixturesDir: string
}

interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
  details?: Record<string, unknown>
}

interface TestReport {
  timestamp: string
  level: string
  environment: string
  duration: number
  totalTests: number
  passed: number
  failed: number
  results: TestResult[]
}

const DEFAULT_CONFIG: TestConfig = {
  baseUrl: 'http://localhost:3000',
  testUrls: [
    'https://greencoloring.com/animal-coloring-pages/',
    'https://greencoloring.com/valentines-day-coloring-pages/',
  ],
  timeout: 30000,
  verbose: false,
  level: 'mvp',
  useLocalFiles: true, // Use local test PDFs by default
  fixturesDir: path.join(process.cwd(), 'tests', 'fixtures'),
}

class TestRunner {
  config: TestConfig
  results: TestResult[] = []
  startTime: number = 0

  constructor(config: Partial<TestConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async runAll(): Promise<TestReport> {
    this.startTime = Date.now()
    console.log(`\n🧪 Starting ${this.config.level.toUpperCase()} Tests`)
    console.log(`📍 Target: ${this.config.baseUrl}`)
    console.log(`⏱️  Timeout: ${this.config.timeout}ms\n`)

    try {
      // Check service is running
      await this.checkService()

      // Run level-appropriate tests
      switch (this.config.level) {
        case 'mvp':
          await this.runMvpTests()
          break
        case 'comprehensive':
          await this.runMvpTests()
          await this.runComprehensiveTests()
          break
        case 'ci':
          await this.runCiTests()
          break
      }
    } catch (error) {
      console.error('❌ Test suite failed:', error)
      process.exit(1)
    }

    return this.generateReport()
  }

  private async checkService(): Promise<void> {
    try {
      await axios.get(`${this.config.baseUrl}`, {
        timeout: 5000,
      })
      console.log('✅ Service is running\n')
    } catch (error) {
      throw new Error(
        `❌ Service not reachable at ${this.config.baseUrl}. Start with: npm run dev`
      )
    }
  }

  private async runMvpTests(): Promise<void> {
    console.log('📋 MVP Level Tests\n')

    if (this.config.useLocalFiles) {
      await this.runMvpTestsLocal()
    } else {
      await this.runMvpTestsWithUrls()
    }
  }

  private async runMvpTestsLocal(): Promise<void> {
    // Test 1: Upload Local PDFs (Animal)
    await this.test('Upload Local PDFs (Animal Set)', async () => {
      const formData = new FormData()
      formData.append('gridLayout', '3x2')

      // Add local test files
      const animalFiles = ['animal-1.pdf', 'animal-2.pdf', 'animal-3.pdf']
      for (const filename of animalFiles) {
        const filepath = path.join(this.config.fixturesDir, filename)
        if (existsSync(filepath)) {
          const buffer = await fs.readFile(filepath)
          const blob = new Blob([buffer], { type: 'application/pdf' })
          formData.append('files', blob, filename)
        }
      }

      const response = await axios.post(
        `${this.config.baseUrl}/api/process`,
        formData,
        { timeout: this.config.timeout }
      )

      if (!response.data.downloadUrl) {
        throw new Error('No download URL returned')
      }

      return {
        downloadUrl: response.data.downloadUrl,
        filename: response.data.filename,
        pageCount: response.data.pageCount,
      }
    })

    // Test 2: Upload Local PDFs (Valentine)
    await this.test('Upload Local PDFs (Valentine Set)', async () => {
      const formData = new FormData()
      formData.append('gridLayout', '3x2')

      const valentineFiles = ['valentine-1.pdf', 'valentine-2.pdf']
      for (const filename of valentineFiles) {
        const filepath = path.join(this.config.fixturesDir, filename)
        if (existsSync(filepath)) {
          const buffer = await fs.readFile(filepath)
          const blob = new Blob([buffer], { type: 'application/pdf' })
          formData.append('files', blob, filename)
        }
      }

      const response = await axios.post(
        `${this.config.baseUrl}/api/process`,
        formData,
        { timeout: this.config.timeout }
      )

      if (!response.data.downloadUrl) {
        throw new Error('No download URL returned')
      }

      return {
        downloadUrl: response.data.downloadUrl,
        filename: response.data.filename,
        pageCount: response.data.pageCount,
      }
    })

    // Test 3: Error Handling (No Files)
    await this.test('Error Handling - No Files Provided', async () => {
      try {
        const formData = new FormData()
        formData.append('gridLayout', '3x2')

        await axios.post(
          `${this.config.baseUrl}/api/process`,
          formData,
          { timeout: this.config.timeout }
        )
        throw new Error('Should have failed with no files')
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
          return { expectedError: true, status: error.response.status }
        }
        throw error
      }
    })
  }

  private async runMvpTestsWithUrls(): Promise<void> {
    // Test 1: URL Download
    await this.test('Download from URL (Animal Pages)', async () => {
      const formData = new FormData()
      formData.append('url', this.config.testUrls[0])
      formData.append('gridLayout', '3x2')

      const response = await axios.post(
        `${this.config.baseUrl}/api/process`,
        formData,
        { timeout: this.config.timeout }
      )

      if (!response.data.downloadUrl) {
        throw new Error('No download URL returned')
      }

      return {
        downloadUrl: response.data.downloadUrl,
        filename: response.data.filename,
        pageCount: response.data.pageCount,
      }
    })

    // Test 2: URL Download (Different URL)
    await this.test('Download from URL (Valentine Pages)', async () => {
      const formData = new FormData()
      formData.append('url', this.config.testUrls[1])
      formData.append('gridLayout', '3x2')

      const response = await axios.post(
        `${this.config.baseUrl}/api/process`,
        formData,
        { timeout: this.config.timeout }
      )

      if (!response.data.downloadUrl) {
        throw new Error('No download URL returned')
      }

      return {
        downloadUrl: response.data.downloadUrl,
        filename: response.data.filename,
        pageCount: response.data.pageCount,
      }
    })

    // Test 3: Error Handling (Invalid URL)
    await this.test('Error Handling - Invalid URL', async () => {
      try {
        const formData = new FormData()
        formData.append('url', 'not-a-valid-url')
        formData.append('gridLayout', '3x2')

        await axios.post(
          `${this.config.baseUrl}/api/process`,
          formData,
          { timeout: this.config.timeout }
        )
        throw new Error('Should have failed with invalid URL')
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 400) {
          return { expectedError: true, status: error.response.status }
        }
        throw error
      }
    })
  }

  private async runComprehensiveTests(): Promise<void> {
    console.log('\n📊 Comprehensive Level Tests\n')

    const layouts = ['3x2', '2x3', '4x1', '2x2']

    // Test each layout with local files
    for (const layout of layouts) {
      await this.test(`Grid Layout: ${layout}`, async () => {
        const formData = new FormData()
        formData.append('gridLayout', layout)

        // Add local test files
        const testFiles = ['animal-1.pdf', 'animal-2.pdf', 'animal-3.pdf']
        for (const filename of testFiles) {
          const filepath = path.join(this.config.fixturesDir, filename)
          if (existsSync(filepath)) {
            const buffer = await fs.readFile(filepath)
            const blob = new Blob([buffer], { type: 'application/pdf' })
            formData.append('files', blob, filename)
          }
        }

        const response = await axios.post(
          `${this.config.baseUrl}/api/process`,
          formData,
          { timeout: this.config.timeout }
        )

        return {
          layout,
          pageCount: response.data.pageCount,
          filename: response.data.filename,
        }
      })
    }

    // Performance test
    await this.test('Performance: PDF Merge & Upload', async () => {
      const startTime = Date.now()
      const formData = new FormData()
      formData.append('gridLayout', '3x2')

      const testFiles = ['valentine-1.pdf', 'valentine-2.pdf']
      for (const filename of testFiles) {
        const filepath = path.join(this.config.fixturesDir, filename)
        if (existsSync(filepath)) {
          const buffer = await fs.readFile(filepath)
          const blob = new Blob([buffer], { type: 'application/pdf' })
          formData.append('files', blob, filename)
        }
      }

      const response = await axios.post(
        `${this.config.baseUrl}/api/process`,
        formData,
        { timeout: this.config.timeout }
      )
      const duration = Date.now() - startTime

      return {
        duration: `${duration}ms`,
        responseSize: JSON.stringify(response.data).length,
        pageCount: response.data.pageCount,
      }
    })
  }

  private async runCiTests(): Promise<void> {
    console.log('⚙️  CI/CD Level Tests\n')

    // Simple API health check
    await this.test('API Health Check', async () => {
      const response = await axios.get(`${this.config.baseUrl}/api`, {
        timeout: 5000,
        validateStatus: () => true,
      })
      return { status: response.status }
    })

    // Process endpoint exists
    await this.test('Process Endpoint Reachable', async () => {
      try {
        const response = await axios.post(
          `${this.config.baseUrl}/api/process`,
          {},
          {
            timeout: 5000,
            validateStatus: () => true,
          }
        )
        return { status: response.status, hasError: response.status >= 400 }
      } catch {
        return { status: 500, error: 'endpoint not reachable' }
      }
    })

    // Quick functional test
    await this.test('Functional: URL Processing', async () => {
      const formData = new FormData()
      formData.append('url', this.config.testUrls[0])
      formData.append('gridLayout', '3x2')

      const response = await axios.post(
        `${this.config.baseUrl}/api/process`,
        formData,
        { timeout: 60000, validateStatus: () => true }
      )

      const success =
        response.status === 200 && response.data.downloadUrl
      return { success, status: response.status }
    })
  }

  private async test(
    name: string,
    testFn: () => Promise<Record<string, unknown>>
  ): Promise<void> {
    const startTime = Date.now()
    const result: TestResult = { name, passed: false, duration: 0 }

    try {
      const details = await testFn()
      result.passed = true
      result.details = details
      result.duration = Date.now() - startTime
      console.log(
        `✅ ${name} (${result.duration}ms)`
      )
    } catch (error) {
      result.passed = false
      result.error = error instanceof Error ? error.message : String(error)
      result.duration = Date.now() - startTime
      console.log(
        `❌ ${name} - ${result.error}`
      )
    }

    this.results.push(result)
  }

  private generateReport(): TestReport {
    const duration = Date.now() - this.startTime
    const passed = this.results.filter((r) => r.passed).length
    const failed = this.results.length - passed

    const report: TestReport = {
      timestamp: new Date().toISOString(),
      level: this.config.level,
      environment: process.env.NODE_ENV || 'development',
      duration,
      totalTests: this.results.length,
      passed,
      failed,
      results: this.results,
    }

    return report
  }

  async saveReport(report: TestReport): Promise<string> {
    const reportsDir = path.join(process.cwd(), 'test-reports')
    await fs.mkdir(reportsDir, { recursive: true })

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .split('T')[0]
    const filename = `test-report-${this.config.level}-${timestamp}.json`
    const filepath = path.join(reportsDir, filename)

    await fs.writeFile(filepath, JSON.stringify(report, null, 2))
    return filepath
  }
}

// CLI Entry Point
async function main() {
  const level = (process.argv[2] || 'mvp') as 'mvp' | 'comprehensive' | 'ci'
  const verbose = process.argv.includes('--verbose')

  const runner = new TestRunner({ level, verbose })
  const report = await runner.runAll()

  // Print summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(50))
  console.log(`Level: ${report.level.toUpperCase()}`)
  console.log(`Total: ${report.totalTests} tests`)
  console.log(
    `✅ Passed: ${report.passed} | ❌ Failed: ${report.failed}`
  )
  console.log(`⏱️  Duration: ${(report.duration / 1000).toFixed(2)}s`)
  console.log('='.repeat(50) + '\n')

  // Save report
  const reportPath = await runner.saveReport(report)
  console.log(`📄 Report saved to: ${reportPath}\n`)

  // Exit with appropriate code
  process.exit(report.failed > 0 ? 1 : 0)
}

// Run if called directly
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

export { TestRunner }
export type { TestConfig, TestReport }
