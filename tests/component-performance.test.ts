import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Waits for one diagnostic card and verifies its status and timing ceiling.
 *
 * @param page - Playwright page containing the component diagnostics route.
 * @param number - Three-digit diagnostic identifier, such as `001`.
 * @returns The located diagnostic card after all pass assertions succeed.
 * @throws When the diagnostic fails, never completes, or reports invalid timing metadata.
 */
const assertDiagnosticPass = async (page: Page, number: string): Promise<Locator> => {
    const card = page.getByTestId(`diagnostic-${number}`)

    await expect
        .poll(() => card.getAttribute('data-status'), {
            message: `Diagnostic ${number} did not finish`,
            timeout: 30000
        })
        .toMatch(/^(pass|fail)$/)

    const diagnostics = (await card.innerText()).trim()
    const status = await card.getAttribute('data-status')
    await expect(card).toHaveAttribute('data-elapsed-ms', /^\d+(?:\.\d+)?$/)
    await expect(card).toHaveAttribute('data-ceiling-ms', /^\d+(?:\.\d+)?$/)
    const elapsed = Number(await card.getAttribute('data-elapsed-ms'))
    const ceiling = Number(await card.getAttribute('data-ceiling-ms'))

    expect(status, diagnostics).toBe('pass')
    expect(Number.isFinite(elapsed), diagnostics).toBe(true)
    expect(Number.isFinite(ceiling), diagnostics).toBe(true)
    expect(elapsed, diagnostics).toBeLessThanOrEqual(ceiling)

    return card
}

/**
 * Verifies that a reserved diagnostic remains visibly pending.
 *
 * @param card - Locator for the reserved diagnostic card.
 * @returns A promise that resolves after its pending state is visible.
 * @throws When the card does not expose the expected pending state.
 */
const expectPending = async (card: Locator) => {
    await expect(card).toHaveAttribute('data-status', 'pending')
    await expect(card).toContainText('PENDING')
}

/**
 * Installs a mutation observer that records every required rerun state before the click occurs.
 *
 * The evidence is retained on the document element, so the test remains deterministic even when
 * the diagnostic completes before Playwright can make its next round trip.
 *
 * @param button - Locator for the exact rerun button whose state should be observed.
 * @param number - Three-digit diagnostic identifier whose running state should be observed.
 * @returns A promise that resolves once the observer is installed.
 * @throws When the diagnostic controls cannot be found.
 */
const observeRunningState = async (button: Locator, number: string): Promise<void> => {
    await button.evaluate((observedButton, diagnosticNumber) => {
        const root = document.documentElement
        const overall = document.querySelector<HTMLElement>('[data-testid="diagnostic-overall"]')
        const card = document.querySelector<HTMLElement>(
            `[data-testid="diagnostic-${diagnosticNumber}"]`
        )

        if (!(observedButton instanceof HTMLButtonElement) || !overall || !card) {
            throw new Error(`Unable to observe diagnostic ${diagnosticNumber} running state`)
        }

        delete root.dataset.observedButtonDisabled
        delete root.dataset.observedOverallRunning
        delete root.dataset.observedCardRunning

        const recordState = (records: MutationRecord[] = []) => {
            if (observedButton.disabled) root.dataset.observedButtonDisabled = 'true'
            if (overall.dataset.status === 'running') root.dataset.observedOverallRunning = 'true'
            if (card.dataset.status === 'running') root.dataset.observedCardRunning = 'true'

            for (const record of records) {
                if (
                    record.target === observedButton &&
                    record.attributeName === 'disabled' &&
                    record.oldValue !== null
                ) {
                    root.dataset.observedButtonDisabled = 'true'
                }
                if (
                    record.target === overall &&
                    record.attributeName === 'data-status' &&
                    record.oldValue === 'running'
                ) {
                    root.dataset.observedOverallRunning = 'true'
                }
                if (
                    record.target === card &&
                    record.attributeName === 'data-status' &&
                    record.oldValue === 'running'
                ) {
                    root.dataset.observedCardRunning = 'true'
                }
            }

            if (
                root.dataset.observedButtonDisabled === 'true' &&
                root.dataset.observedOverallRunning === 'true' &&
                root.dataset.observedCardRunning === 'true'
            ) {
                observer.disconnect()
            }
        }

        const observer = new MutationObserver(recordState)
        observer.observe(document.body, {
            attributes: true,
            attributeOldValue: true,
            attributeFilter: ['data-status', 'disabled'],
            subtree: true
        })
        recordState()
    }, number)
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
    await observeRunningState(runButton, '001')
    await runButton.click()
    const documentElement = page.locator('html')
    await expect(documentElement).toHaveAttribute('data-observed-button-disabled', 'true')
    await expect(documentElement).toHaveAttribute('data-observed-overall-running', 'true')
    await expect(documentElement).toHaveAttribute('data-observed-card-running', 'true')

    card = await assertDiagnosticPass(page, '001')
    await expect(card.getByTestId('diagnostic-001-samples').getByRole('listitem')).toHaveCount(5)
    await expect(overall).toHaveAttribute('data-status', 'pass')

    const firstCapture = componentOutput.locator('[title="value_0"]')
    const lastCapture = componentOutput.locator('[title="value_749"]')
    await expect(firstCapture).toHaveText('12000')
    await expect(lastCapture).toHaveText('12749')
    await expect(page.getByTestId('current-run-context')).toContainText('Measured sample 5 of 5')
    await expect(page.getByTestId('boundary-captures')).toContainText(
        'value_0=12000, value_749=12749'
    )
    await expect(page.getByTestId('boundary-rendered')).toContainText(
        'value_0=12000, value_749=12749'
    )
    const firstCaptureBackground = await firstCapture.evaluate(
        (element) => getComputedStyle(element).backgroundColor
    )
    expect(firstCaptureBackground, 'Expected captures must remain visibly highlighted').not.toBe(
        'rgba(0, 0, 0, 0)'
    )

    for (const number of ['003', '004', '005']) {
        await expectPending(page.getByTestId(`diagnostic-${number}`))
    }
})

test('002 tags expected regions within the forward-sweep ceiling', async ({ page }) => {
    await page.goto('/tests/component-performance')

    const card = await assertDiagnosticPass(page, '002')
    await expect(card).toContainText('10000 equal segments / 5000 sorted ranges')
    await expect(card.getByTestId('diagnostic-002-samples').getByRole('listitem')).toHaveCount(3)
    await expect(card).toHaveAttribute(
        'data-samples-ms',
        /^\d+(?:\.\d+)?,\d+(?:\.\d+)?,\d+(?:\.\d+)?$/
    )
    await expect(card).toHaveAttribute('data-segment-count', '10000')
    await expect(card).toHaveAttribute('data-range-count', '5000')
    await expect(card).toHaveAttribute('data-output-count', '10000')
    await expect(card).toHaveAttribute('data-failure-reasons', '')
    await expect(page.getByTestId('diagnostic-overall')).toHaveAttribute('data-status', 'pass')

    for (const number of ['003', '004', '005']) {
        await expectPending(page.getByTestId(`diagnostic-${number}`))
    }
})
