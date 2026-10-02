import { expect, test, type Locator, type Page } from '@playwright/test'

const route = '/tests/code-diff'
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
        if (
            message.type() === 'error' ||
            (message.type() === 'warning' && /hydrat/i.test(message.text()))
        )
            messages.push(message.text())
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

test('mixed whitespace SSR and hydration preserve normalized projections without warnings', async ({
    browser,
    baseURL,
    page
}) => {
    const before = '\tconst emoji = "😀";\r\n// old\rnext\n'
    const after = '\tconst emoji = "👩‍💻";\r\n// new\rnext\n'
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
    try {
        const ssr = await context.newPage()
        await ssr.goto(route)
        await verifySources(
            ssr.getByRole('region', { name: 'Whitespace code differences', exact: true }),
            before,
            after
        )
    } finally {
        await context.close()
    }
    const messages = errors(page)
    await page.goto(route)
    // A client control change proves hydration completed; the whitespace block is unchanged.
    await page.getByRole('combobox', { name: 'Diff mode', exact: true }).selectOption('word')
    await verifySources(
        page.getByRole('region', { name: 'Whitespace code differences', exact: true }),
        before,
        after
    )
    expect(messages).toEqual([])
})
