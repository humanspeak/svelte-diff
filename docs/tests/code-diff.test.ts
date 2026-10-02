import { expect, test, type Locator, type Page } from '@playwright/test'

const route = '/examples/code-diff'
const initialBefore = `type User = { name: string; active: boolean }

export function loadTeam(ids: string[]): Promise<User[]> {
    // Fetch each teammate, then keep the active ones.
    return Promise.all(ids.map(id =>
        fetch('/api/users/' + id).then(res => res.json())
    )).then(users => users.filter(user => user.active));
}
`
const initialAfter = `type User = { name: string; active: boolean }

export async function loadTeam(ids: string[]): Promise<User[]> {
    // Fetch in parallel; fail early on a bad response.
    const users = await Promise.all(ids.map(async id => {
        const res = await fetch(\`/api/users/\${encodeURIComponent(id)}\`);
        if (!res.ok) throw new Error(\`User \${id}: \${res.status}\`);
        return await res.json() as User;
    }));
    return users.filter(({ active }) => active);
}
`
const normalize = (text: string) => text.replace(/\r\n?/g, '\n')
const result = (page: Page) => page.getByRole('region', { name: 'Code differences', exact: true })
const errors = (page: Page) => {
    const messages: string[] = []
    page.on('pageerror', (error) => messages.push(error.message))
    page.on('console', (message) => {
        const text = message.text()
        if (/hydrat/i.test(text)) {
            messages.push(text)
            return
        }
        // The site's pre-existing Ahrefs script is blocked by its CSP.
        if (
            text.startsWith("Loading the script 'https://analytics.ahrefs.com/analytics.js'") &&
            text.includes('violates the following Content Security Policy directive')
        )
            return
        if (message.type() === 'error') messages.push(text)
    })
    return messages
}
const projection = async (region: Locator, excluded: string) =>
    region.locator('code').evaluate(
        (code, excluded) =>
            Array.from(code.children)
                .filter((run) => run.getAttribute('data-diff') !== excluded)
                .map((run) => run.textContent)
                .join(''),
        excluded
    )
const verifySources = async (region: Locator, before: string, after: string) => {
    expect(normalize(await projection(region, 'insert'))).toBe(normalize(before))
    expect(normalize(await projection(region, 'remove'))).toBe(normalize(after))
}

test('SSR colors unchanged and changed source without JavaScript', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
    try {
        const page = await context.newPage()
        const messages = errors(page)
        await page.goto(route)
        const region = result(page)
        await expect(region.locator('code')).toHaveCount(1)
        await expect(region.locator('del .th-keyword').first()).toHaveText('export')
        await expect(region.locator('ins .th-keyword').first()).toHaveText('export')
        await expect(region.locator('[data-diff="equal"] .th-keyword').first()).toHaveText('type')
        for (const token of [
            region.locator('del .th-keyword').first(),
            region.locator('ins .th-keyword').first(),
            region.locator('[data-diff="equal"] .th-keyword').first()
        ]) {
            const color = await token.evaluate((element) => getComputedStyle(element).color)
            expect(color).not.toBe(
                await region.evaluate((element) => getComputedStyle(element).color)
            )
        }
        expect(
            await region
                .locator('del')
                .first()
                .evaluate((element) => getComputedStyle(element).textDecorationLine)
        ).toBe('none')
        await verifySources(region, initialBefore, initialAfter)
        expect(messages).toEqual([])
    } finally {
        await context.close()
    }
})

test('hydrated editing covers all modes, language fallback, literal source and reset', async ({
    page
}) => {
    const messages = errors(page)
    await page.goto(route)
    const region = result(page)
    const before = page.getByLabel('Before', { exact: true })
    const after = page.getByLabel('After', { exact: true })
    await expect(before).toHaveValue(normalize(initialBefore))
    await expect(after).toHaveValue(normalize(initialAfter))
    await expect(page.locator('.status')).toHaveText('Async refactor')
    await expect(page.getByRole('combobox', { name: 'Language', exact: true })).toHaveValue(
        'typescript'
    )
    await expect(page.getByRole('combobox', { name: 'Theme', exact: true })).toHaveValue('system')
    await verifySources(region, initialBefore, initialAfter)
    await expect(page.getByRole('combobox', { name: 'Diff mode', exact: true })).toHaveValue('line')
    await before.fill('const value = 10;\n')
    await after.fill('const value = 20;\n')
    for (const [mode, removed, inserted] of [
        ['character', '1', '2'],
        ['word', '10', '20'],
        ['line', 'const value = 10;\n', 'const value = 20;\n']
    ]) {
        await page.getByRole('combobox', { name: 'Diff mode', exact: true }).selectOption(mode)
        await expect.poll(() => region.locator('del').allTextContents()).toEqual([removed])
        await expect.poll(() => region.locator('ins').allTextContents()).toEqual([inserted])
        await verifySources(region, 'const value = 10;\n', 'const value = 20;\n')
    }
    for (const language of ['javascript', 'json', 'plaintext', 'unregistered', 'typescript']) {
        await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption(language)
        await verifySources(region, 'const value = 10;\n', 'const value = 20;\n')
        if (language === 'plaintext' || language === 'unregistered')
            await expect(region.locator('[class^="th-"]')).toHaveCount(0)
    }
    await page.getByRole('button', { name: 'Multiline context', exact: true }).click()
    const sourceBefore = await before.inputValue()
    const sourceAfter = await after.inputValue()
    expect(sourceBefore).toContain('(?<year>\\d{4})')
    expect(sourceAfter).toContain('<img onerror=alert(1)>')
    for (const mode of ['character', 'word', 'line']) {
        await page.getByRole('combobox', { name: 'Diff mode', exact: true }).selectOption(mode)
        await verifySources(region, sourceBefore, sourceAfter)
        await expect(region.locator('del .th-comment')).not.toHaveCount(0)
        await expect(region.locator('ins .th-string')).not.toHaveCount(0)
        await expect(region.locator('script,img,br')).toHaveCount(0)
    }
    await page.getByRole('button', { name: 'Reset', exact: true }).click()
    await expect(page.locator('.status')).toHaveText('Async refactor')
    await expect(before).toHaveValue(normalize(initialBefore))
    await expect(after).toHaveValue(normalize(initialAfter))
    await expect(page.getByRole('combobox', { name: 'Diff mode', exact: true })).toHaveValue('line')
    await expect(page.getByRole('combobox', { name: 'Language', exact: true })).toHaveValue(
        'typescript'
    )
    await expect(page.getByRole('combobox', { name: 'Theme', exact: true })).toHaveValue('system')
    await verifySources(region, initialBefore, initialAfter)
    expect(messages).toEqual([])
})

test('default line mode keeps manual async replacements in complete blocks', async ({ page }) => {
    const messages = errors(page)
    await page.goto(route)
    const region = result(page)
    const mode = page.getByRole('combobox', { name: 'Diff mode', exact: true })
    const before = page.getByLabel('Before', { exact: true })
    const after = page.getByLabel('After', { exact: true })
    await expect(mode).toHaveValue('line')
    await expect(before).toHaveValue(normalize(initialBefore))
    await expect(after).toHaveValue(normalize(initialAfter))
    await expect(page.locator('.status')).toHaveText('Async refactor')
    const sourceBefore = initialBefore
    const sourceAfter = 'const manual = true;\n'
    await after.fill(sourceAfter)
    await expect(before).toHaveValue(sourceBefore)
    await expect(region.locator('del')).toHaveCount(1)
    await expect(region.locator('ins')).toHaveCount(1)
    await expect
        .poll(async () => (await region.locator('del').allTextContents()).map(normalize))
        .toEqual([normalize(sourceBefore)])
    await expect
        .poll(async () => (await region.locator('ins').allTextContents()).map(normalize))
        .toEqual([normalize(sourceAfter)])
    await verifySources(region, sourceBefore, sourceAfter)
    await page.reload()
    await expect(before).toHaveValue(normalize(initialBefore))
    await expect(after).toHaveValue(normalize(initialAfter))
    await expect(mode).toHaveValue('line')
    await expect(page.locator('.status')).toHaveText('Async refactor')
    await expect(page.getByRole('combobox', { name: 'Language', exact: true })).toHaveValue(
        'typescript'
    )
    await expect(page.getByRole('combobox', { name: 'Theme', exact: true })).toHaveValue('system')
    await verifySources(region, initialBefore, initialAfter)
    expect(messages).toEqual([])
})

test('theme changes preserve source and existing Svelte-owned nodes', async ({ page }) => {
    const messages = errors(page)
    await page.goto(route)
    const region = result(page)
    await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('light')
    const pre = await region.elementHandle()
    const token = region.locator('.th-keyword').first()
    const tokenNode = await token.elementHandle()
    const light = await token.evaluate((element) => getComputedStyle(element).color)
    const source = await region.textContent()
    await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('dark')
    expect(await token.evaluate((element) => getComputedStyle(element).color)).not.toBe(light)
    expect(await region.textContent()).toBe(source)
    expect(await region.evaluate((element, previous) => element === previous, pre)).toBe(true)
    expect(await token.evaluate((element, previous) => element === previous, tokenNode)).toBe(true)
    await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('light')
    expect(await token.evaluate((element) => getComputedStyle(element).color)).toBe(light)
    expect(messages).toEqual([])
})

test('keyboard horizontal overflow stays within mobile page width', async ({ page }) => {
    const messages = errors(page)
    await page.goto(route)
    const long = `const long = "${'x'.repeat(1000)}";\n`
    await page.getByLabel('Before', { exact: true }).fill(long)
    await page.getByLabel('After', { exact: true }).fill(long)
    const region = result(page)
    expect(await region.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
    await region.focus()
    await expect(region).toBeFocused()
    await region.press('ArrowRight')
    await expect.poll(() => region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
        true
    )
    await verifySources(region, long, long)
    expect(messages).toEqual([])
})

test('public show-code, notes and generated discovery expose the optional API', async ({
    page,
    request
}) => {
    const messages = errors(page)
    await page.goto('/examples')
    await page.locator('main a[href="/examples/code-diff"]').first().click()
    await expect(page).toHaveURL(/\/examples\/code-diff$/)
    await page.getByRole('button', { name: 'Show show code', exact: true }).click()
    const source = page
        .locator('pre')
        .filter({ hasText: "from '@humanspeak/svelte-diff/code'" })
        .first()
    await expect(source).toBeVisible()
    await expect(source).toContainText("from '@tanstack/highlight/languages/ts'")
    await expect(source).toContainText('Multiline context')
    const related = page
        .locator('.dk-ex-notes')
        .getByRole('navigation', { name: 'Related reading', exact: true })
    await expect(related.getByRole('link')).toHaveCount(3)
    for (const [label, destination] of [
        ['Code diffs guide', '/docs/guides/code-diffs'],
        ['CodeDiff API', '/docs/api/code-diff'],
        ['Diff modes guide', '/docs/guides/diff-modes']
    ]) {
        await page.goto(route)
        await page.locator('.dk-ex-notes').getByRole('link', { name: label, exact: true }).click()
        await expect(page).toHaveURL(new RegExp(`${destination}$`))
    }
    const routes = ['/examples/code-diff', '/docs/guides/code-diffs', '/docs/api/code-diff']
    const sitemap = await request.get('/sitemap.xml')
    expect(sitemap.status()).toBe(200)
    const sitemapText = await sitemap.text()
    const llms = await request.get('/llms.txt')
    expect(llms.status()).toBe(200)
    const llmsText = await llms.text()
    for (const destination of routes) {
        expect(sitemapText).toContain(`https://diff.svelte.page${destination}`)
        expect(llmsText).toContain(destination)
        const mirror = await request.get(`${destination}.md`)
        expect(mirror.status()).toBe(200)
        expect(await mirror.text()).toContain('@humanspeak/svelte-diff/code')
    }
    const full = await request.get('/llms-full.txt')
    expect(full.status()).toBe(200)
    expect(await full.text()).toContain('CodeDiffProps')
    expect(messages).toEqual([])
})
