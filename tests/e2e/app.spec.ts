import { test, expect } from '@playwright/test'

test.describe('App loads and renders', () => {
  test('homepage displays title and description', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Coloring Book Grid Maker')
    await expect(page.locator('text=Combine coloring pages into a printable grid PDF')).toBeVisible()
  })

  test('main card with tabs is visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Upload PDFs')).toBeVisible()
    await expect(page.locator('text=Download from URL')).toBeVisible()
  })
})

test.describe('Tab navigation', () => {
  test('Upload tab is active by default', async ({ page }) => {
    await page.goto('/')
    // Upload tab should show the drag-and-drop area
    await expect(page.locator('text=Drag and drop PDFs here')).toBeVisible()
  })

  test('switching to URL tab shows URL input', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Download from URL')
    await expect(page.locator('input#url')).toBeVisible()
    await expect(page.locator('text=Website URL')).toBeVisible()
  })

  test('switching back to Upload tab restores upload area', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Download from URL')
    await page.click('text=Upload PDFs')
    await expect(page.locator('text=Drag and drop PDFs here')).toBeVisible()
  })
})

test.describe('Grid layout selector', () => {
  test('all four grid layout options are displayed', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=3 wide × 2 high (6 per page)')).toBeVisible()
    await expect(page.locator('text=2 wide × 3 high (6 per page)')).toBeVisible()
    await expect(page.locator('text=4 wide × 1 high (4 per page)')).toBeVisible()
    await expect(page.locator('text=2 wide × 2 high (4 per page)')).toBeVisible()
  })

  test('3x2 layout is selected by default', async ({ page }) => {
    await page.goto('/')
    const selected = page.locator('button:has-text("3 wide × 2 high")')
    await expect(selected).toHaveClass(/border-indigo-600/)
  })

  test('clicking a different layout selects it', async ({ page }) => {
    await page.goto('/')
    const button2x2 = page.locator('button:has-text("2 wide × 2 high")')
    await button2x2.click()
    await expect(button2x2).toHaveClass(/border-indigo-600/)
  })
})

test.describe('Form validation', () => {
  test('Create Grid PDF button is disabled when no files selected on Upload tab', async ({ page }) => {
    await page.goto('/')
    const submitButton = page.locator('button:has-text("Create Grid PDF")')
    await expect(submitButton).toBeDisabled()
  })

  test('Create Grid PDF button is disabled when URL is empty on URL tab', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Download from URL')
    const submitButton = page.locator('button:has-text("Create Grid PDF")')
    await expect(submitButton).toBeDisabled()
  })

  test('typing a URL enables the submit button', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Download from URL')
    await page.fill('input#url', 'https://example.com/coloring-pages')
    const submitButton = page.locator('button:has-text("Create Grid PDF")')
    await expect(submitButton).toBeEnabled()
  })
})

test.describe('URL submission flow', () => {
  test('submitting a URL shows the progress indicator', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Download from URL')
    await page.fill('input#url', 'https://example.com/coloring-pages')

    // Click submit - don't await navigation since it's a client-side fetch
    await page.click('button:has-text("Create Grid PDF")')

    // Progress indicator should appear
    await expect(page.locator('text=Processing your files...')).toBeVisible({ timeout: 5000 })
  })
})
