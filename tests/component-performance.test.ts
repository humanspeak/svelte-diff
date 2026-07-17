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
    let card = await assertDiagnosticPass(page, '001')
    await expect(card.getByTestId('diagnostic-001-samples').getByRole('listitem')).toHaveCount(5)
    const overall = page.getByTestId('diagnostic-overall')
    await expect(overall).toHaveAttribute('data-status', 'pass')

    const preview = page.getByTestId('live-capability-preview')
    const previewScroll = page.getByTestId('live-preview-scroll')
    const componentOutput = page.getByTestId('live-component-output')
    await expect(preview).toBeVisible()
    await expect(preview).toContainText('fixed at 750 named groups')
    await expect(preview).toContainText('Blue highlights')
    await expect(componentOutput).toBeVisible()

    const previewDimensions = await previewScroll.evaluate((element) => ({
        width: element.clientWidth,
        height: element.clientHeight,
        scrollHeight: element.scrollHeight
    }))
    expect(previewDimensions.width, 'The live preview must have readable width').toBeGreaterThan(
        300
    )
    expect(previewDimensions.height, 'The live preview must have readable height').toBeGreaterThan(
        200
    )
    expect(
        previewDimensions.scrollHeight,
        'The full mounted workload must be scrollable in the live preview'
    ).toBeGreaterThan(previewDimensions.height)

    const outputBox = await componentOutput.boundingBox()
    expect(
        outputBox?.width ?? 0,
        'The actual SvelteDiff output must not be clipped'
    ).toBeGreaterThan(300)
    expect(
        outputBox?.height ?? 0,
        'The actual SvelteDiff output must not be clipped'
    ).toBeGreaterThan(200)

    const runButton = page.getByRole('button', { name: 'Run all diagnostics' })
    await runButton.click()
    await expect(runButton).toBeDisabled()
    await expect(overall).toHaveAttribute('data-status', 'running')
    await expect(card).toHaveAttribute('data-status', 'running')

    card = await assertDiagnosticPass(page, '001')
    await expect(card.getByTestId('diagnostic-001-samples').getByRole('listitem')).toHaveCount(5)
    await expect(overall).toHaveAttribute('data-status', 'pass')

    const firstCapture = componentOutput.locator('[title="value_0"]')
    const lastCapture = componentOutput.locator('[title="value_749"]')
    await expect(firstCapture).toHaveText('105000')
    await expect(lastCapture).toHaveText('105749')
    await expect(page.getByTestId('current-run-context')).toContainText('Measured sample 5 of 5')
    await expect(page.getByTestId('boundary-captures')).toContainText(
        'value_0=105000, value_749=105749'
    )
    await expect(page.getByTestId('boundary-rendered')).toContainText(
        'value_0=105000, value_749=105749'
    )
    const firstCaptureBackground = await firstCapture.evaluate(
        (element) => getComputedStyle(element).backgroundColor
    )
    expect(firstCaptureBackground, 'Expected captures must remain visibly highlighted').not.toBe(
        'rgba(0, 0, 0, 0)'
    )

    for (const number of ['002', '003', '004', '005']) {
        await expectPending(page.getByTestId(`diagnostic-${number}`))
    }
})
