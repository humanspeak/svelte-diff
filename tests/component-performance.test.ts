import { expect, test, type Locator, type Page } from '@playwright/test'

const assertDiagnosticPass = async (page: Page, number: string) => {
    const card = page.getByTestId(`diagnostic-${number}`)

    await expect
        .poll(() => card.getAttribute('data-status'), {
            message: `Diagnostic ${number} did not finish`,
            timeout: 30000
        })
        .toMatch(/^(pass|fail)$/)

    const diagnostics = (await card.innerText()).trim()
    const status = await card.getAttribute('data-status')
    const elapsed = Number(await card.getAttribute('data-elapsed-ms'))
    const ceiling = Number(await card.getAttribute('data-ceiling-ms'))

    expect(status, diagnostics).toBe('pass')
    expect(Number.isFinite(elapsed), diagnostics).toBe(true)
    expect(Number.isFinite(ceiling), diagnostics).toBe(true)
    expect(elapsed, diagnostics).toBeLessThanOrEqual(ceiling)

    return card
}

const expectPending = async (card: Locator) => {
    await expect(card).toHaveAttribute('data-status', 'pending')
    await expect(card).toContainText('PENDING')
}

test('001 compiles expected-pattern metadata within the change ceiling', async ({ page }) => {
    await page.goto('/tests/component-performance')

    await expect(
        page.getByRole('heading', { name: 'Component performance diagnostics' })
    ).toBeVisible()
    const card = await assertDiagnosticPass(page, '001')
    await expect(card.getByTestId('diagnostic-001-samples').getByRole('listitem')).toHaveCount(5)
    await expect(page.getByTestId('diagnostic-overall')).toHaveAttribute('data-status', 'pass')

    for (const number of ['002', '003', '004', '005']) {
        await expectPending(page.getByTestId(`diagnostic-${number}`))
    }
})
