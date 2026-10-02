import { expect, test } from '@playwright/test'

test.describe('Expected Patterns', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tests/expected-patterns')
    })

    test('renders expected regions with distinct styling', async ({ page }) => {
        await expect(
            page.getByTestId('diff-result').locator('.diff-expected').first()
        ).toBeVisible()
    })

    test('expected regions expose group names for hover and custom tooltips', async ({ page }) => {
        const result = page.getByTestId('diff-result')
        for (const name of ['year', 'holder']) {
            const capture = result.locator(`span[data-capture-name="${name}"]`)
            await expect(capture).toBeVisible()
            await expect(capture).toHaveAttribute('title', name)
            await expect(capture).toHaveAttribute(
                'data-capture-value',
                (await capture.textContent())!
            )
        }
        await page.getByTestId('text1').fill('Owner (?<owner>\\w+)')
        await page.getByTestId('text2').fill('Owner Alpha')
        await expect(result.locator('span[data-capture-name="owner"]')).toHaveText('Alpha')
        await expect(result.locator('span[data-capture-name="owner"]')).toHaveAttribute(
            'data-capture-value',
            'Alpha'
        )
        await page.getByTestId('text2').fill('Owner Beta')
        await expect(result.locator('span[data-capture-name="owner"]')).toHaveAttribute(
            'data-capture-value',
            'Beta'
        )
        await expect(
            result.locator('[data-capture-name="year"], [data-capture-name="holder"]')
        ).toHaveCount(0)
    })

    test('non-captured deviations still show as insert/remove', async ({ page }) => {
        // Use \w+ instead of .+ so the capture is constrained to "Jason" only,
        // leaving "coding" vs "hacking" as a real deviation for insert/remove
        await page.getByTestId('text1').fill('(?<name>\\w+) likes coding')
        await page.getByTestId('text2').fill('Jason likes hacking')
        await expect(
            page.getByTestId('diff-result').locator('.diff-expected').first()
        ).toBeVisible()
        await expect(page.getByTestId('diff-result').locator('.diff-remove').first()).toBeVisible()
        await expect(page.getByTestId('diff-result').locator('.diff-insert').first()).toBeVisible()
    })

    test('falls back to normal diff when regex does not match', async ({ page }) => {
        await page.getByTestId('text2').fill('This is not a license at all')
        await expect(page.getByTestId('diff-result').locator('.diff-expected')).toHaveCount(0)
        await expect(page.getByTestId('diff-result').locator('.diff-remove').first()).toBeVisible()
    })

    test('works like normal diff when no capture groups in original', async ({ page }) => {
        await page.getByTestId('text1').fill('hello world')
        await page.getByTestId('text2').fill('hello brave world')
        await expect(page.getByTestId('diff-result').locator('.diff-expected')).toHaveCount(0)
        await expect(page.getByTestId('diff-result')).toContainText('brave')
    })

    test('matches repeated template contexts in order across target edits', async ({ page }) => {
        const pageErrors: Error[] = []
        page.on('pageerror', (error) => pageErrors.push(error))
        const result = page.getByTestId('diff-result')
        await page.getByTestId('text1').fill('Item: (?<first>\\w+)\nItem: (?<second>\\w+)')
        await page.getByTestId('text2').fill('Item: Alpha\nItem: Beta')
        await expect(result.locator('span[title="first"]')).toHaveText('Alpha')
        await expect(result.locator('span[title="second"]')).toHaveText('Beta')
        await expect(result.locator('.diff-remove, .diff-insert')).toHaveCount(0)
        await page.getByTestId('text2').fill('Item: Alpha\nItem: Gamma')
        await expect(result.locator('span[title="first"]')).toHaveText('Alpha')
        await expect(result.locator('span[title="second"]')).toHaveText('Gamma')
        await expect(result.locator('.diff-remove, .diff-insert')).toHaveCount(0)
        await expect(result).not.toContainText('Beta')
        expect(pageErrors).toEqual([])
    })

    test('keeps invalid templates literal and recovers to expected captures', async ({ page }) => {
        const pageErrors: Error[] = []
        page.on('pageerror', (error) => pageErrors.push(error))
        const result = page.getByTestId('diff-result')
        for (const invalid of [
            '(?<bad>*)',
            '(?<id>\\d+) (?<id>\\w+)',
            'A: (?<id>\\w+)\nB: (?<id>\\w+)'
        ]) {
            await page.getByTestId('text1').fill(invalid)
            await page.getByTestId('text2').fill(invalid)
            await expect(result).toHaveText(invalid, { useInnerText: true })
            await expect(result.locator('.diff-expected')).toHaveCount(0)
        }
        await page.getByTestId('text1').fill('Copyright (?<year>\\d{4}) MIT')
        await page.getByTestId('text2').fill('Copyright 2024 MIT')
        await expect(result.locator('.diff-expected[title="year"]')).toHaveText('2024')
        expect(pageErrors).toEqual([])
    })
})
