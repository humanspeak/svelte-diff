import { expect, test } from '@playwright/test'

test.describe('SvelteDiffMatchPatch', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        // Typing before hydration is lost, leaving the default diff rendered.
        await expect(page.locator('[data-hydrated="true"]')).toBeAttached()
    })

    test('renders a visible diff', async ({ page }) => {
        await page.getByTestId('text1').fill('hello world')
        await page.getByTestId('text2').fill('hello brave world')
        await expect(page.getByTestId('diff-result')).toContainText('brave')
        await expect(page.getByTestId('diff-result')).toContainText('hello')
        await expect(page.getByTestId('diff-result')).toContainText('world')
    })

    test('applies custom rendererClasses', async ({ page }) => {
        await page.getByTestId('text1').fill('foo shoo')
        await page.getByTestId('text2').fill('bar shoo')
        await expect(page.getByTestId('diff-result').locator('.diff-remove')).toBeVisible()
        await expect(page.getByTestId('diff-result').locator('.diff-insert')).toBeVisible()
        await expect(page.getByTestId('diff-result').locator('.diff-equal')).toBeVisible()
    })

    test('diff output is accessible', async ({ page }) => {
        await expect(page.getByTestId('diff-result')).toBeVisible()
    })

    test('does not skip heading levels', async ({ page }) => {
        const headings = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => ({
                level: parseInt(h.tagName[1]),
                text: h.textContent
            }))
        })
        for (let i = 1; i < headings.length; i++) {
            const diff = headings[i].level - headings[i - 1].level
            expect(diff).toBeLessThanOrEqual(1)
        }
    })

    test('all links and images are accessible', async ({ page }) => {
        const links = await page.getByRole('link').all()
        for (const link of links) {
            expect(
                (await link.getAttribute('aria-label')) || (await link.textContent())
            ).toBeTruthy()
        }
        const images = await page.getByRole('img').all()
        for (const img of images) {
            expect(await img.getAttribute('alt')).toBeTruthy()
        }
    })
})
