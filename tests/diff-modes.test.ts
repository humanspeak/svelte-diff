import { expect, test } from '@playwright/test'

test('hydrates compact equal text and preserves nodes across multiline updates', async ({
    page
}) => {
    const runtimeErrors: string[] = []
    page.on('pageerror', (error) => runtimeErrors.push(error.message))
    page.on('console', (message) => {
        if (/hydration/i.test(message.text())) runtimeErrors.push(message.text())
    })
    await page.goto('/tests/diff-modes')
    const result = page.getByRole('region', { name: 'Compact equal text' })
    const after = page.getByLabel('After', { exact: true })
    await expect(result).toHaveText('The car sleeps.')

    for (const mode of ['character', 'word', 'line']) {
        await page.getByLabel('Diff mode').selectOption(mode)
        await after.fill('alpha\nbeta\n')
        await expect(result).toHaveText('alphabeta')
        await expect(result.locator('br')).toHaveCount(2)
        await expect(result.locator('span')).toHaveCount(0)
        await result
            .locator('br')
            .first()
            .evaluate((node) => {
                node.setAttribute('data-retained', 'true')
            })
        await after.fill('gamma\ndelta\n')
        await expect(result).toHaveText('gammadelta')
        await expect(result.locator('br').first()).toHaveAttribute('data-retained', 'true')

        await after.fill('\nalpha\n\nomega\n')
        await expect(result.locator('br')).toHaveCount(4)
        const reconstructedText = await result.evaluate((element) => {
            const copy = element.cloneNode(true) as HTMLElement
            copy.querySelectorAll('br').forEach((node) => node.replaceWith('\n'))
            return copy.textContent
        })
        expect(reconstructedText).toBe('\nalpha\n\nomega\n')

        await after.fill('single line')
        await expect(result).toHaveText('single line')
        await expect(result.locator('br')).toHaveCount(0)
    }
    expect(runtimeErrors).toEqual([])
})

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
    await expect(page.getByRole('region', { name: 'Literal code' })).toHaveText(
        'const pattern = /(?<year>\\d{4})/;'
    )
    const template = page.getByRole('region', { name: 'Template comparison' })
    await expect(template.locator('[data-capture-name]')).toHaveCount(0)
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
    await expect(result).toHaveText('count=10count=20keep=true')
    await expect(page.getByRole('region', { name: 'Default character' })).toHaveText(
        'count=120keep=true'
    )
    await expect(page.locator('[data-custom-break]')).toHaveCount(3)
    const capture = page.getByRole('region', { name: 'Expected capture' })
    await expect(capture.locator('del')).toHaveText('Release v2')
    await expect(capture.locator('mark')).toHaveText('v2')
    await expect(capture.locator('mark')).toHaveAttribute('title', 'version')
    await mode.selectOption('character')
    await expect(result.locator('del')).toHaveText('1')
    await expect(result.locator('ins')).toHaveText('2')
    await expect(result).toHaveText('count=120keep=true')
    await mode.selectOption('line')
    await page.getByLabel('Before', { exact: true }).fill('The cat sleeps.')
    await page.getByLabel('After', { exact: true }).fill('The car sleeps.')
    await expect(result.locator('del')).toHaveText('The cat sleeps.')
    await expect(result.locator('ins')).toHaveText('The car sleeps.')
    await expect(result).toHaveText('The cat sleeps.The car sleeps.')
    await expect(result.locator('br')).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Default character' })).toHaveText(
        'The catr sleeps.'
    )
    expect(errors).toEqual([])
})

test('hydrates literal source and switches pattern interpretation in every mode', async ({
    page
}) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
        if (/hydration/i.test(message.text())) errors.push(message.text())
    })
    await page.goto('/tests/diff-modes')
    const literal = page.getByRole('region', { name: 'Literal code' })
    const template = page.getByRole('region', { name: 'Template comparison' })
    const patterns = page.getByLabel('Enable template patterns')
    for (const mode of ['character', 'word', 'line']) {
        await page.getByLabel('Diff mode').selectOption(mode)
        await expect(literal).toHaveText('const pattern = /(?<year>\\d{4})/;')
        await expect(literal.locator('[data-capture-name]')).toHaveCount(0)
        for (const enabled of [true, false, true, false]) {
            await patterns.setChecked(enabled)
            await expect(template.locator('[data-capture-name]')).toHaveCount(enabled ? 1 : 0)
            const sides = await template.evaluate((element) => {
                const before = element.cloneNode(true) as HTMLElement
                const after = element.cloneNode(true) as HTMLElement
                before.querySelectorAll('ins').forEach((node) => node.remove())
                after.querySelectorAll('del').forEach((node) => node.remove())
                return [before.textContent, after.textContent]
            })
            expect(sides).toEqual([enabled ? 'Year 2026' : 'Year (?<year>\\d{4})', 'Year 2026'])
            if (enabled) {
                await expect(template.locator('[data-capture-name]')).toHaveAttribute(
                    'data-capture-value',
                    '2026'
                )
            }
        }
    }
    expect(errors).toEqual([])
})
