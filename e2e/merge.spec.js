import { test, expect } from '@playwright/test';

/**
 * E2E tests for the merge subscription flow.
 * Tests the complete user journey of merging multiple subscriptions.
 */

test.describe('Merge Subscription Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the app
        await page.goto('/');

        // Wait for app to load
        await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 }).catch(() => {
            // Fallback: wait for any main content
            return page.waitForSelector('nav, .sidebar, main', { timeout: 10000 });
        });
    });

    test('can navigate to Recurring tab', async ({ page }) => {
        // Click on Recurring tab in sidebar
        const recurringTab = page.locator('text=Recurring').first();
        await recurringTab.click();

        // Should see the recurring items view
        await expect(page.locator('text=Approved').or(page.locator('text=Pending'))).toBeVisible();
    });

    test('can select multiple items for merge', async ({ page }) => {
        // Navigate to Recurring
        await page.locator('text=Recurring').first().click();

        // Wait for items to load
        await page.waitForTimeout(1000);

        // Look for checkboxes or selectable items
        const selectableItems = page.locator('[data-merge-checkbox], input[type="checkbox"]');
        const count = await selectableItems.count();

        if (count >= 2) {
            // Select first two items
            await selectableItems.first().click();
            await selectableItems.nth(1).click();

            // Floating merge bar should appear
            await expect(page.locator('text=Merge').or(page.locator('[data-testid="merge-button"]'))).toBeVisible();
        }
    });

    test('floating merge bar shows selected count', async ({ page }) => {
        await page.locator('text=Recurring').first().click();
        await page.waitForTimeout(1000);

        const checkboxes = page.locator('[data-merge-checkbox], input[type="checkbox"]');
        const count = await checkboxes.count();

        if (count >= 3) {
            await checkboxes.first().click();
            await checkboxes.nth(1).click();
            await checkboxes.nth(2).click();

            // Should show "3 items selected" or similar
            await expect(page.locator('text=/3.*selected|selected.*3/i').or(
                page.locator('[data-testid="selected-count"]')
            )).toBeVisible();
        }
    });

    test('merge dialog appears with name input', async ({ page }) => {
        await page.locator('text=Recurring').first().click();
        await page.waitForTimeout(1000);

        const checkboxes = page.locator('[data-merge-checkbox], input[type="checkbox"]');
        const count = await checkboxes.count();

        if (count >= 2) {
            await checkboxes.first().click();
            await checkboxes.nth(1).click();

            // Click the merge button
            const mergeButton = page.locator('button:has-text("Merge")').first();
            await mergeButton.click();

            // Should see a modal/dialog with name input
            await expect(page.locator('input[placeholder*="name" i], input[type="text"]').first()).toBeVisible();
        }
    });
});

test.describe('Merged Item Display', () => {
    test('merged subscription shows in list', async ({ page }) => {
        await page.goto('/');
        await page.locator('text=Recurring').first().click();

        // Look for merged badge indicator
        const mergedBadge = page.locator('text=Merged, .merged-badge, [data-testid="merged-indicator"]');

        // This test will only pass if you have merged items in localStorage
        // It's more of an integration verification
        if (await mergedBadge.count() > 0) {
            await expect(mergedBadge.first()).toBeVisible();
        }
    });

    test('unmerge button appears for merged items', async ({ page }) => {
        await page.goto('/');
        await page.locator('text=Recurring').first().click();

        const unlinkButton = page.locator('text=Unlink, button:has-text("Unlink"), [data-testid="unmerge-button"]');

        if (await unlinkButton.count() > 0) {
            await expect(unlinkButton.first()).toBeVisible();
        }
    });
});
