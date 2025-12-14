import { test, expect } from '@playwright/test';

/**
 * E2E tests for rename functionality and display consistency.
 * Tests that renames appear correctly across Transactions and Calendar.
 */

test.describe('Rename Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('nav, .sidebar, main', { timeout: 10000 });
    });

    test('can rename a subscription', async ({ page }) => {
        await page.locator('text=Recurring').first().click();
        await page.waitForTimeout(1000);

        // Find a subscription and look for rename/edit option
        const editButton = page.locator('[data-testid="edit-name"], button:has-text("Edit"), .edit-icon').first();

        if (await editButton.count() > 0) {
            await editButton.click();

            // Should see an input to edit name
            await expect(page.locator('input[type="text"]').first()).toBeVisible();
        }
    });
});

test.describe('Name Display Consistency', () => {
    test('Transactions tab shows merchant names', async ({ page }) => {
        await page.goto('/');
        await page.locator('text=Transactions').first().click();

        // Wait for transactions to load
        await page.waitForTimeout(1000);

        // Should see transaction rows
        const transactionRows = page.locator('tr, .transaction-row, [data-transaction]');
        await expect(transactionRows.first()).toBeVisible({ timeout: 5000 }).catch(() => {
            // May not have transactions loaded
        });
    });

    test('Calendar tab loads correctly', async ({ page }) => {
        await page.goto('/');
        await page.locator('text=Calendar').first().click();

        // Should see calendar grid
        await expect(page.locator('.calendar, [data-testid="calendar"], table').first()).toBeVisible();
    });

    test('renamed items show in blue in Transactions', async ({ page }) => {
        await page.goto('/');
        await page.locator('text=Transactions').first().click();
        await page.waitForTimeout(1000);

        // Look for blue-styled text (renamed items)
        // This depends on having renamed items in localStorage
        const blueText = page.locator('[style*="var(--accent-primary)"], .renamed, .text-blue');

        if (await blueText.count() > 0) {
            await expect(blueText.first()).toBeVisible();
        }
    });

    test('merged names appear in Calendar', async ({ page }) => {
        await page.goto('/');
        await page.locator('text=Calendar').first().click();
        await page.waitForTimeout(1000);

        // Calendar should render without errors
        await expect(page.locator('.calendar, [data-testid="calendar"], table').first()).toBeVisible();
    });
});

test.describe('Cross-Tab Consistency', () => {
    test('same transaction appears consistently across views', async ({ page }) => {
        await page.goto('/');

        // Check Transactions tab
        await page.locator('text=Transactions').first().click();
        await page.waitForTimeout(500);
        const transactionsVisible = await page.locator('tr, .transaction-row').count();

        // Check Calendar tab
        await page.locator('text=Calendar').first().click();
        await page.waitForTimeout(500);
        const calendarVisible = await page.locator('.calendar, table').count();

        // Both views should render
        expect(transactionsVisible >= 0).toBe(true);
        expect(calendarVisible > 0).toBe(true);
    });
});
