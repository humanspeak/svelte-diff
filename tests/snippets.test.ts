import { expect, test } from '@playwright/test'

test.describe('SvelteDiff snippets', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/snippets')
    })

    test('renders remove, insert, and equal child snippets', async ({ page }) => {
        const original = page.getByTestId('text1')
        const modified = page.getByTestId('text2')
        const result = page.getByTestId('diff-result')

        await original.fill('shared old value')
        await modified.fill('shared new value')
        await expect(original).toHaveValue('shared old value')
        await expect(modified).toHaveValue('shared new value')
        await expect(result).toContainText('shared')
        await expect(result).toContainText('old')
        await expect(result).toContainText('new')

        await expect(result.locator('.diff-snippet-remove').first()).toBeVisible()
        await expect(result.locator('.diff-snippet-insert').first()).toBeVisible()
        await expect(result.locator('.diff-snippet-equal').first()).toBeVisible()
        await expect(result.locator('.diff-remove')).toHaveCount(0)
        await expect(result.locator('.diff-insert')).toHaveCount(0)
    })

    test('uses the custom line-break snippet', async ({ page }) => {
        const result = page.getByTestId('diff-result')
        const original = page.getByTestId('text1')
        const modified = page.getByTestId('text2')

        await original.fill('')
        await modified.fill('')
        await expect(result).toBeEmpty()
        await original.fill('alpha\nbeta')
        await expect(original).toHaveValue('alpha\nbeta')
        await modified.fill('alpha\nbeta')
        await expect(modified).toHaveValue('alpha\nbeta')

        await expect(result).toHaveText('alphabeta')
        await expect(result.locator('.diff-snippet-equal')).toHaveCount(2)
        await expect(result.locator('br')).toHaveCount(2)
    })
})
