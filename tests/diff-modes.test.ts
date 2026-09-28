import { expect, test } from '@playwright/test'

test('renders word and line edits in initial HTML without JavaScript', async ({
    browser,
    baseURL
}) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
    const page = await context.newPage()
    await page.goto('/tests/diff-modes')
    await expect(page.getByRole('region', { name: 'Initial word' }).locator('del')).toHaveText(
        'cat'
    )
    await expect(page.getByRole('region', { name: 'Initial word' }).locator('ins')).toHaveText(
        'car'
    )
    await expect(page.getByRole('region', { name: 'Initial line' }).locator('del')).toHaveText(
        'count=10'
    )
    await expect(page.getByRole('region', { name: 'Initial line' }).locator('ins')).toHaveText(
        'count=20'
    )
    await context.close()
})

test('hydrates, switches units, edits and preserves custom capture markup', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
        if (/hydration/i.test(message.text())) errors.push(message.text())
    })
    await page.goto('/tests/diff-modes')
    const result = page.getByRole('region', { name: 'Interactive result' })
    const mode = page.getByLabel('Diff mode')
    await expect(result.locator('del')).toHaveText('t')
    expect(await result.innerHTML()).toBe(
        await page.getByRole('region', { name: 'Default character' }).innerHTML()
    )
    await mode.selectOption('word')
    await expect(result.locator('del')).toHaveText('cat')
    await expect(result.locator('ins')).toHaveText('car')
    await mode.selectOption('line')
    await expect(result.locator('del')).toHaveText('The cat sleeps.')
    await page.getByLabel('Before', { exact: true }).fill('count=10\nkeep=true\n')
    await page.getByLabel('After', { exact: true }).fill('count=20\nkeep=true\n')
    await expect(result.locator('del')).toHaveText('count=10')
    await expect(result.locator('ins')).toHaveText('count=20')
    await expect(result.locator('[data-equal]')).toHaveText('keep=true')
    await expect(page.locator('[data-custom-break]')).toHaveCount(3)
    const capture = page.getByRole('region', { name: 'Expected capture' })
    await expect(capture.locator('del')).toHaveText('Release v2')
    await expect(capture.locator('mark')).toHaveText('v2')
    await expect(capture.locator('mark')).toHaveAttribute('title', 'version')
    await mode.selectOption('character')
    await expect(result.locator('del')).toHaveText('1')
    expect(errors).toEqual([])
})
