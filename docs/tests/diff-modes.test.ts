import { expect, test, type Locator, type Page } from '@playwright/test'

const demoStorageKey = 'svelte-diff:homepage-demo:v1'
const sampleBefore = 'Release v1.8.0 is ready for review.\nThe documentation will ship after launch.\nOwner: Product Engineering'
const sampleAfter = 'Release v2.0.0 is ready for final review.\nThe documentation will ship with the launch.\nOwner: Developer Experience'

const modes = ['word', 'line'] as const
const routes = ['/examples/word-diff', '/examples/line-diff', '/docs/guides/diff-modes']
const titleCase = (text: string) => text[0].toUpperCase() + text.slice(1)
const assertWidth = async (page: Page) => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
}
const assertScroll = async (region: Locator, footer: Locator) => {
    await expect.poll(() => region.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
    await region.focus()
    await region.press('PageDown')
    await expect.poll(() => region.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    const footerHandle = await footer.elementHandle()
    expect(footerHandle).not.toBeNull()
    const { outputBottom, footerTop } = await region.evaluate((element, footerElement) => ({
        outputBottom: element.getBoundingClientRect().bottom,
        footerTop: footerElement!.getBoundingClientRect().top
    }), footerHandle!)
    await footerHandle!.dispose()
    expect(footerTop).toBeGreaterThanOrEqual(outputBottom - 1)
}
const collectFeatureErrors = (page: Page) => {
    const errors: string[] = []
    page.on('pageerror', (error) => {
        // External analytics failures are unrelated to the component contract.
        if (!/cloudflareinsights|analytics|Content Security Policy/i.test(error.message)) errors.push(error.message)
    })
    page.on('console', (message) => {
        if (/hydration/i.test(message.text())) errors.push(message.text())
    })
    return errors
}

for (const route of routes) {
    test(`${route} metadata, navigation, social card`, async ({ page, request }) => {
        const response = await page.goto(route)
        expect(response?.status()).toBe(200)
        await expect(page.locator('h1')).toHaveCount(1)
        await expect(page.locator('h1')).toContainText(/Diff/i)
        await expect(page).toHaveTitle(/Diff.*Svelte Diff/)
        expect((await page.locator('meta[name="description"]').getAttribute('content'))?.length).toBeGreaterThan(30)
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://diff.svelte.page${route}`)
        expect(await page.locator('meta[name="robots"]').evaluateAll((elements) => elements.map((element) => element.getAttribute('content')).join(' '))).not.toMatch(/noindex/i)
        await expect(page.locator('a[href="/docs/guides/diff-modes"]').first()).toBeAttached()
        if (route.startsWith('/examples/')) {
            await expect(page.locator('a[href="/examples"]').first()).toBeAttached()
            await expect(page.locator('a[href="/docs/api/svelte-diff"]').first()).toBeAttached()
            await expect(page.locator('a[href="/docs/guides/expected-patterns"]').first()).toBeAttached()
        }
        await expect(page.getByRole('navigation', { name: 'Breadcrumb', includeHidden: true })).toContainText(route.startsWith('/examples/') ? 'Examples' : 'Guides')
        await expect(async () => {
            const scripts = await page.locator('script[type="application/ld+json"]').allTextContents()
            const breadcrumb = scripts.map((text) => JSON.parse(text)).find((data) => data['@type'] === 'BreadcrumbList')
            expect(breadcrumb).toBeDefined()
            const expectedBreadcrumbs = route === '/docs/guides/diff-modes' ? [
                { '@type': 'ListItem', name: 'Home', position: 1, item: 'https://diff.svelte.page/' },
                { '@type': 'ListItem', name: 'Docs', position: 2, item: 'https://diff.svelte.page/docs/getting-started' },
                { '@type': 'ListItem', name: 'Diff Modes', position: 3 }
            ] : route === '/examples/word-diff' ? [
                { '@type': 'ListItem', name: 'Home', position: 1, item: 'https://diff.svelte.page/' },
                { '@type': 'ListItem', name: 'Examples', position: 2, item: 'https://diff.svelte.page/examples' },
                { '@type': 'ListItem', name: 'Word Diff', position: 3 }
            ] : [
                { '@type': 'ListItem', name: 'Home', position: 1, item: 'https://diff.svelte.page/' },
                { '@type': 'ListItem', name: 'Examples', position: 2, item: 'https://diff.svelte.page/examples' },
                { '@type': 'ListItem', name: 'Line Diff', position: 3 }
            ]
            expect(breadcrumb.itemListElement).toEqual(expectedBreadcrumbs)
        }).toPass({ timeout: 5000 })
        const imageUrl = await page.locator('meta[property="og:image"]').getAttribute('content')
        expect(imageUrl).toBeTruthy()
        const image = await request.get(new URL(imageUrl!).pathname)
        expect(image.status()).toBe(200)
        expect(image.headers()['content-type']).toMatch(/^image\//)
        expect((await image.body()).length).toBeGreaterThan(100)
        await assertWidth(page)
    })
}

for (const mode of modes) {
    test(`${mode} example edits, resets, source, scrolling and hydration`, async ({ page }) => {
        const errors = collectFeatureErrors(page)
        await page.goto(`/examples/${mode}-diff`)
        const region = page.getByRole('region', { name: `${titleCase(mode)} result`, exact: true })
        const raw = page.getByRole('region', { name: 'Raw character result', exact: true })
        await expect(region.locator('del')).toHaveText(mode === 'word' ? 'cat' : 'count=10')
        await expect(region.locator('ins')).toHaveText(mode === 'word' ? 'car' : 'count=20')
        await expect(raw.locator('del')).toHaveText(mode === 'word' ? 't' : '1')
        const before = page.getByLabel('Before', { exact: true })
        const after = page.getByLabel('After', { exact: true })
        const initialBefore = await before.inputValue()
        const initialAfter = await after.inputValue()
        await before.fill('The cat sleeps.')
        await after.fill('The dog sleeps.')
        await expect(region.locator('ins')).toHaveText(mode === 'word' ? 'dog' : 'The dog sleeps.')
        if (mode === 'line') {
            await page.getByRole('button', { name: 'Blank lines / final newline' }).click()
            await expect(before).toHaveValue('count=10\n\nkeep=true')
            await expect(after).toHaveValue('count=20\n\nkeep=true\n')
        }
        const longText = Array.from({ length: 100 }, (_, index) => `line ${index} cat`).join('\n')
        await before.fill(longText)
        await after.fill(longText.replaceAll('cat', 'dog'))
        await assertScroll(region, region.locator('..').locator('footer'))
        await assertScroll(raw, raw.locator('..').locator('footer'))
        await before.fill('x'.repeat(10000))
        await after.fill('y'.repeat(10000))
        await assertWidth(page)
        await page.getByRole('button', { name: 'Reset', exact: true }).click()
        await expect(before).toHaveValue(initialBefore)
        await expect(after).toHaveValue(initialAfter)
        await expect(region.locator('del')).toHaveText(mode === 'word' ? 'cat' : 'count=10')
        await page.getByRole('button', { name: 'Show show code', exact: true }).click()
        await expect(page.locator('pre').filter({ hasText: `diffMode="${mode}"` }).first()).toBeVisible()
        await expect(page.locator('pre').filter({ hasText: "from '@humanspeak/svelte-diff'" }).first()).toBeVisible()
        const other = mode === 'word' ? 'line' : 'word'
        await page.getByRole('navigation', { name: 'Related reading' }).getByRole('link', { name: `${titleCase(other)} example`, exact: true }).click()
        await expect(page).toHaveURL(new RegExp(`/examples/${other}-diff$`))
        expect(errors).toEqual([])
    })

    test(`${mode} example SSR includes atomic edits without JavaScript`, async ({ browser, baseURL }) => {
        const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
        const page = await context.newPage()
        await page.goto(`/examples/${mode}-diff`)
        const region = page.getByRole('region', { name: `${titleCase(mode)} result`, exact: true })
        await expect(region.locator('del')).toHaveText(mode === 'word' ? 'cat' : 'count=10')
        await expect(region.locator('ins')).toHaveText(mode === 'word' ? 'car' : 'count=20')
        await context.close()
    })
}

test('homepage mode control preserves edits, labels, reset and scrolling', async ({ page }) => {
    const errors = collectFeatureErrors(page)
    await page.goto('/#compare-two-strings')
    const demo = page.locator('#compare-two-strings')
    const selector = demo.getByRole('radiogroup', { name: 'Diff mode', exact: true })
    const character = selector.getByRole('radio', { name: 'Character', exact: true })
    const word = selector.getByRole('radio', { name: 'Word', exact: true })
    const line = selector.getByRole('radio', { name: 'Line', exact: true })
    const before = demo.getByLabel('SRC-A / BEFORE')
    const after = demo.getByLabel('SRC-B / AFTER')
    const region = demo.getByRole('region', { name: 'Compared text' })
    const initialBefore = await before.inputValue()
    const initialAfter = await after.inputValue()
    await expect(character).toBeChecked()
    await expect(word).not.toBeChecked()
    await expect(line).not.toBeChecked()
    await before.fill('The cat sleeps.')
    await after.fill('The car sleeps.')
    for (const mode of ['word', 'line', 'character']) {
        await selector.getByText(titleCase(mode), { exact: true }).click()
        await expect(selector.getByRole('radio', { name: titleCase(mode), exact: true })).toBeChecked()
        await expect(before).toHaveValue('The cat sleeps.')
        await expect(after).toHaveValue('The car sleeps.')
        await expect(region.locator('.diff-remove')).toHaveText(mode === 'word' ? 'cat' : mode === 'line' ? 'The cat sleeps.' : 't')
        await expect(demo.locator('.output-label')).toContainText(mode.toUpperCase())
        await expect(demo.locator('.panel-footer')).toContainText(`mode · ${mode}`)
        await expect(demo.locator('.panel-footer')).toContainText(mode === 'character' ? 'semantic' : 'skipped')
        const footerOffset = await demo.locator('.demo-panel').evaluate((panel) => {
            const footer = panel.querySelector('.panel-footer')!
            return Math.abs(footer.getBoundingClientRect().bottom - panel.getBoundingClientRect().bottom)
        })
        expect(footerOffset).toBeLessThanOrEqual(2)
    }
    await character.focus()
    await character.press('ArrowRight')
    await expect(word).toBeChecked()
    await expect(character).not.toBeChecked()
    await expect(line).not.toBeChecked()
    await expect(region.locator('.diff-remove')).toHaveText('cat')
    await expect(demo.locator('.output-label')).toContainText('WORD')
    await expect(demo.locator('.panel-footer')).toContainText('mode · word')
    await assertWidth(page)
    const segmentBoxes = await selector.locator('.mode-options label > span').evaluateAll((segments) =>
        segments.map((segment) => {
            const { width, height } = segment.getBoundingClientRect()
            return { width, height }
        })
    )
    expect(segmentBoxes).toHaveLength(3)
    for (const dimension of ['width', 'height'] as const) {
        const sizes = segmentBoxes.map((box) => box[dimension])
        expect(Math.min(...sizes)).toBeGreaterThan(0)
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
    }
    const controlBox = await selector.boundingBox()
    expect(controlBox!.x).toBeGreaterThanOrEqual(0)
    expect(controlBox!.x + controlBox!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
    const longText = Array.from({ length: 100 }, (_, index) => `line ${index} cat`).join('\n')
    await before.fill(longText)
    await after.fill(longText.replaceAll('cat', 'dog'))
    for (const mode of ['character', 'word', 'line']) {
        await selector.getByText(titleCase(mode), { exact: true }).click()
        await expect(selector.getByRole('radio', { name: titleCase(mode), exact: true })).toBeChecked()
        await region.evaluate((element) => { element.scrollTop = 0 })
        await assertScroll(region, demo.locator('.panel-footer'))
        await assertWidth(page)
    }
    await before.fill('x'.repeat(10000))
    await after.fill('y'.repeat(10000))
    for (const mode of ['character', 'word', 'line']) {
        await selector.getByText(titleCase(mode), { exact: true }).click()
        await expect(selector.getByRole('radio', { name: titleCase(mode), exact: true })).toBeChecked()
        await assertWidth(page)
    }
    await demo.getByRole('button', { name: /reset/i }).click()
    await expect(before).toHaveValue(initialBefore)
    await expect(after).toHaveValue(initialAfter)
    await expect(character).toBeChecked()
    await expect(word).not.toBeChecked()
    await expect(line).not.toBeChecked()
    await expect(demo.locator('.panel-footer')).toContainText('semantic')
    for (const href of routes) await expect(demo.locator(`a[href="${href}"]`)).toBeVisible()
    expect(errors).toEqual([])
})

test('homepage restores exact edits and mode, and reset forgets only the demo', async ({ page }) => {
    const errors = collectFeatureErrors(page)
    await page.goto('/#compare-two-strings')
    const demo = page.locator('#compare-two-strings')
    const before = demo.getByLabel('SRC-A / BEFORE')
    const after = demo.getByLabel('SRC-B / AFTER')
    const mode = (name: string) => demo.getByRole('radio', { name, exact: true })
    const readSaved = () => page.evaluate((key) => localStorage.getItem(key), demoStorageKey)
    await expect(before).toHaveValue(sampleBefore)
    await expect(after).toHaveValue(sampleAfter)
    await expect(mode('Character')).toBeChecked()
    await expect.poll(readSaved).toBeNull()

    // Changing only the mode must survive a reload with both sample texts intact.
    await demo.getByText('Word', { exact: true }).click()
    await page.reload()
    await expect(mode('Word')).toBeChecked()
    await expect(before).toHaveValue(sampleBefore)
    await expect(after).toHaveValue(sampleAfter)

    const original = '  Café 👩🏽‍💻\n\n東京 e\u0301\tfin\n'
    const modified = 'Δοκιμή 🐈\n  新しい行\n\n'
    await before.fill(original)
    await after.fill(modified)
    await demo.getByText('Line', { exact: true }).click()
    await page.reload()
    await expect(before).toHaveValue(original)
    await expect(after).toHaveValue(modified)
    await expect(mode('Line')).toBeChecked()
    await before.fill('')
    await page.reload()
    await expect(before).toHaveValue('')
    await expect(after).toHaveValue(modified)
    await expect(mode('Line')).toBeChecked()
    await before.fill(original)
    await after.fill('')
    await page.reload()
    await expect(before).toHaveValue(original)
    await expect(after).toHaveValue('')
    await expect(mode('Line')).toBeChecked()

    await page.evaluate(() => localStorage.setItem('unrelated-preference', 'keep'))
    await demo.getByRole('button', { name: /reset/i }).click()
    await expect(before).toHaveValue(sampleBefore)
    await expect(after).toHaveValue(sampleAfter)
    await expect(mode('Character')).toBeChecked()
    await expect.poll(readSaved).toBeNull()
    await page.reload()
    await expect(before).toHaveValue(sampleBefore)
    await expect(after).toHaveValue(sampleAfter)
    await expect(mode('Character')).toBeChecked()
    await expect.poll(readSaved).toBeNull()
    expect(await page.evaluate(() => localStorage.getItem('unrelated-preference'))).toBe('keep')
    expect(errors).toEqual([])
})

for (const [description, saved] of [
    ['corrupt JSON', '{broken'],
    ['null', 'null'],
    ['missing fields', '{}'],
    ['non-string original', JSON.stringify({ originalText: 42, modifiedText: '', diffMode: 'word' })],
    ['non-string modified', JSON.stringify({ originalText: '', modifiedText: false, diffMode: 'line' })],
    ['invalid mode', JSON.stringify({ originalText: 'saved', modifiedText: 'saved', diffMode: 'WORD' })]
]) {
    test(`homepage ignores ${description} and remains editable`, async ({ page }) => {
        const errors = collectFeatureErrors(page)
        await page.goto('/')
        await page.evaluate(({ key, saved }) => localStorage.setItem(key, saved), { key: demoStorageKey, saved })
        await page.reload()
        const demo = page.locator('#compare-two-strings')
        await expect(demo.getByLabel('SRC-A / BEFORE')).toHaveValue(sampleBefore)
        await expect(demo.getByLabel('SRC-B / AFTER')).toHaveValue(sampleAfter)
        await expect(demo.getByRole('radio', { name: 'Character', exact: true })).toBeChecked()
        await demo.getByLabel('SRC-A / BEFORE').fill('cat')
        await demo.getByLabel('SRC-B / AFTER').fill('dog')
        await demo.getByText('Word', { exact: true }).click()
        await expect(demo.locator('.diff-remove')).toHaveText('cat')
        await expect(demo.locator('.diff-insert')).toHaveText('dog')
        expect(errors).toEqual([])
    })
}

for (const operation of ['getItem', 'setItem', 'removeItem'] as const) {
    test(`homepage remains usable when storage ${operation} is denied`, async ({ page }) => {
        const errors = collectFeatureErrors(page)
        await page.addInitScript(({ key, operation }) => {
            const original = Storage.prototype[operation]
            Object.defineProperty(Storage.prototype, operation, {
                configurable: true,
                writable: true,
                value: function (this: Storage, itemKey: string, value?: string) {
                    if (itemKey === key) throw new DOMException('Demo storage denied', 'SecurityError')
                    return Reflect.apply(original, this, [itemKey, value])
                }
            })
        }, { key: demoStorageKey, operation })
        await page.goto('/#compare-two-strings')
        const demo = page.locator('#compare-two-strings')
        const before = demo.getByLabel('SRC-A / BEFORE')
        const after = demo.getByLabel('SRC-B / AFTER')
        await expect(before).toHaveValue(sampleBefore)
        await expect(after).toHaveValue(sampleAfter)
        await expect(demo.getByRole('radio', { name: 'Character', exact: true })).toBeChecked()
        await before.fill('cat')
        await after.fill('dog')
        await demo.getByText('Line', { exact: true }).click()
        await expect(demo.getByRole('radio', { name: 'Line', exact: true })).toBeChecked()
        await expect(demo.locator('.diff-remove')).toHaveText('cat')
        await expect(demo.locator('.diff-insert')).toHaveText('dog')
        await demo.getByRole('button', { name: /reset/i }).click()
        await expect(before).toHaveValue(sampleBefore)
        await expect(after).toHaveValue(sampleAfter)
        await expect(demo.getByRole('radio', { name: 'Character', exact: true })).toBeChecked()
        await before.fill('')
        await after.fill('still editable')
        await expect(demo.getByRole('region', { name: 'Compared text' })).toHaveText('still editable')
        expect(errors).toEqual([])
    })
}

test('index cards, sitemap, Markdown mirrors and LLM references include modes', async ({ page, request }) => {
    await page.goto('/examples')
    for (const mode of modes) {
        await page.locator(`main a[href="/examples/${mode}-diff"]`).first().click()
        await expect(page).toHaveURL(new RegExp(`/examples/${mode}-diff$`))
        await page.goto('/examples')
    }
    const sitemap = await request.get('/sitemap.xml')
    expect(sitemap.status()).toBe(200)
    for (const route of routes) expect(await sitemap.text()).toContain(`https://diff.svelte.page${route}`)
    for (const route of routes) {
        const mirrorPath = route === '/docs/guides/diff-modes' ? '/docs/guides-diff-modes.md' : `${route}.md`
        const mirror = await request.get(mirrorPath)
        expect(mirror.status()).toBe(200)
        expect(await mirror.text()).toContain('diffMode')
        if (route.startsWith('/examples/')) expect(await mirror.text()).toContain('@humanspeak/svelte-diff')
    }
    const llms = await request.get('/llms.txt')
    expect(llms.status()).toBe(200)
    for (const route of routes) expect(await llms.text()).toContain(route)
    const full = await request.get('/llms-full.txt')
    expect(full.status()).toBe(200)
    expect(await full.text()).toContain('65,535')
    expect(await full.text()).toContain('SvelteDiffMode')
})
