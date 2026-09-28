import { expect, test, type Page } from '@playwright/test'

// User-facing reading order, independent of the catalog implementation.
const slugs = ['basic-diff', 'word-diff', 'line-diff', 'live-editor', 'expected-patterns', 'custom-snippets', 'cleanup-modes', 'timing']
const titles = ['Basic Diff', 'Word Diff', 'Line Diff', 'Live Editor', 'Expected Patterns', 'Custom Snippets', 'Cleanup Modes', 'Timing']
const hrefs = slugs.map((slug) => `/examples/${slug}`)
const number = (index: number) => String(index + 1).padStart(2, '0')
const pager = (page: Page) => page.getByRole('navigation', { name: 'Example pagination', exact: true })

async function assertPager(page: Page, index: number) {
    const previous = (index + slugs.length - 1) % slugs.length
    const next = (index + 1) % slugs.length
    const navigation = pager(page)
    await expect(navigation).toBeVisible()
    await expect(navigation.getByRole('link')).toHaveCount(2)
    await expect(navigation.getByRole('link', { name: /prev/ })).toHaveAttribute('href', hrefs[previous])
    await expect(navigation.getByRole('link', { name: /prev/ })).toContainText(`prev / № ${number(previous)}`)
    await expect(navigation.getByRole('link', { name: /prev/ })).toContainText(`${slugs[previous]}.`)
    await expect(navigation.getByRole('link', { name: /next/ })).toHaveAttribute('href', hrefs[next])
    await expect(navigation.getByRole('link', { name: /next/ })).toContainText(`next / № ${number(next)}`)
    await expect(navigation.getByRole('link', { name: /next/ })).toContainText(`${slugs[next]}.`)
    // The counter is intentionally hidden on mobile, but retains the sheet position.
    await expect(navigation.locator('.dk-pager-counter')).toHaveText(`sheet № ${number(index)} / 08`)
    await navigation.scrollIntoViewIfNeeded()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}

test('gallery and docs navigation share the numbered reading order', async ({ page }) => {
    await page.goto('/examples')
    await expect(pager(page)).toHaveCount(0)
    const cards = page.locator('.brut-grid-section a.cell')
    await expect(cards).toHaveCount(8)
    expect(await cards.evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(hrefs)
    for (let index = 0; index < slugs.length; index++) {
        await expect(cards.nth(index).locator('.id')).toHaveText(`№ ${number(index)} / 08`)
        await expect(cards.nth(index).getByRole('heading')).toHaveText(`${titles[index].toLowerCase()}.`)
    }
    await cards.first().click()
    await expect(page).toHaveURL(/\/examples\/basic-diff$/)
    await assertPager(page, 0)

    // The docs sidebar is a desktop surface; check its real rendered links.
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/docs/guides/diff-modes')
    const section = page.locator('.dk-sb-section').filter({ has: page.getByRole('button', { name: 'Interactive Examples', exact: true }) })
    const toggle = section.getByRole('button', { name: 'Interactive Examples', exact: true })
    if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click()
    await expect(section.getByRole('link')).toHaveText(['All Examples', ...titles])
    expect(await section.getByRole('link').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(['/examples', ...hrefs])
})

test('next traverses every sheet reactively; previous wraps and supports keyboard navigation', async ({ page }) => {
    await page.goto(hrefs[0])
    // A surviving window marker distinguishes client navigation from full reloads.
    await page.evaluate(() => { (window as Window & { pagerNavigationMarker?: boolean }).pagerNavigationMarker = true })
    for (let index = 0; index < slugs.length; index++) {
        await assertPager(page, index)
        await pager(page).getByRole('link', { name: /next/ }).click()
        await expect(page).toHaveURL(new RegExp(`${hrefs[(index + 1) % slugs.length]}$`))
    }
    await assertPager(page, 0)
    const previous = pager(page).getByRole('link', { name: /prev/ })
    await previous.focus()
    await expect(previous).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(pager(page).getByRole('link', { name: /next/ })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(previous).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/examples\/timing$/)
    await assertPager(page, 7)
    await pager(page).getByRole('link', { name: /prev/ }).click()
    await expect(page).toHaveURL(/\/examples\/cleanup-modes$/)
    await assertPager(page, 6)
    expect(await page.evaluate(() => (window as Window & { pagerNavigationMarker?: boolean }).pagerNavigationMarker)).toBe(true)
})

test('SSR supplies real pager anchors and works without JavaScript', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
    try {
        const page = await context.newPage()
        for (let index = 0; index < slugs.length; index++) {
            await page.goto(hrefs[index])
            await assertPager(page, index)
        }
        await pager(page).getByRole('link', { name: /next/ }).click()
        await expect(page).toHaveURL(/\/examples\/basic-diff$/)
        await assertPager(page, 0)
        await pager(page).getByRole('link', { name: /prev/ }).click()
        await expect(page).toHaveURL(/\/examples\/timing$/)
        await page.goto('/examples')
        await expect(pager(page)).toHaveCount(0)
    } finally {
        await context.close()
    }
})

for (const mode of ['word', 'line']) {
    test(`${mode} related reading is visible inside notes and all destinations work`, async ({ page }) => {
        const other = mode === 'word' ? 'Line' : 'Word'
        const links = [
            ['Diff modes guide', '/docs/guides/diff-modes'],
            ['API', '/docs/api/svelte-diff'],
            [`${other} example`, `/examples/${other.toLowerCase()}-diff`],
            ['Expected patterns', '/docs/guides/expected-patterns']
        ]
        for (const [label, href] of links) {
            await page.goto(`/examples/${mode}-diff`)
            const related = page.locator('.dk-ex-notes').getByRole('navigation', { name: 'Related reading' })
            await expect(related).toBeVisible()
            await expect(related.getByRole('link')).toHaveCount(4)
            const boxes = await related.getByRole('link').evaluateAll((elements) => elements.map((element) => {
                const { top, bottom } = element.getBoundingClientRect()
                return { top, bottom }
            }))
            for (let index = 1; index < boxes.length; index++) expect(boxes[index].top).toBeGreaterThan(boxes[index - 1].bottom)
            const link = related.getByRole('link', { name: label, exact: true })
            await expect(link).toHaveAttribute('href', href)
            await link.focus()
            await expect(link).toBeFocused()
            await link.press('Enter')
            await expect(page).toHaveURL(new RegExp(`${href}$`))
        }
    })
}
