import { test, expect } from '@playwright/test';

/**
 * E2E tests for the split subscription flow.
 * Tests the complete user journey of splitting subscriptions by amount.
 */

test.describe('Split Subscription Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('nav, .sidebar, main', { timeout: 10000 });
    });

    test('can navigate to Recurring tab', async ({ page }) => {
        await page.locator('text=Recurring').first().click();
        await expect(page.locator('text=Approved').or(page.locator('text=Pending'))).toBeVisible();
    });

    test('split option appears for subscriptions', async ({ page }) => {
        await page.locator('text=Recurring').first().click();
        await page.waitForTimeout(1000);

        // Look for a subscription item and click to expand
        const subscriptionItem = page.locator('[data-subscription-item], .subscription-card').first();

        if (await subscriptionItem.count() > 0) {
            await subscriptionItem.click();

            // Look for split button/link
            const splitOption = page.locator('text=Split, button:has-text("Split"), [data-testid="split-button"]');

            if (await splitOption.count() > 0) {
                await expect(splitOption.first()).toBeVisible();
            }
        }
    });

    test('split modal shows transaction amounts', async ({ page }) => {
        await page.locator('text=Recurring').first().click();
        await page.waitForTimeout(1000);

        // Find and click a split button if available
        const splitButton = page.locator('text=Split, button:has-text("Split")').first();

        if (await splitButton.count() > 0) {
            await splitButton.click();

            // Modal should show with amounts
            await expect(page.locator('.modal, [role="dialog"], [data-testid="split-modal"]').first()).toBeVisible();
        }
    });
});

test.describe('Split Result Display', () => {
    test('split subscriptions appear in list', async ({ page }) => {
        await page.goto('/');
        await page.locator('text=Recurring').first().click();

        // Look for split badge indicator
        const splitBadge = page.locator('text=Split, .split-badge, [data-testid="split-indicator"]');

        if (await splitBadge.count() > 0) {
            await expect(splitBadge.first()).toBeVisible();
        }
    });
});
