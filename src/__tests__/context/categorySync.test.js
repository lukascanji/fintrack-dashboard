/**
 * Category Sync Tests
 * 
 * Tests to ensure category changes sync correctly between:
 * - Transactions tab → Recurring tab (via categoryOverrides)
 * - Recurring tab → Transactions tab (via category rules + recategorizeAll)
 * 
 * Also verifies that merchant names are preserved when syncing categories.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveCategoryRule, getUserCategoryRules, categorizeMerchant, removeCategoryRule, getMerchantKey } from '../../utils/categorize';

describe('Category Sync', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
    });

    describe('saveCategoryRule', () => {
        it('should save a category rule with pattern, merchant, and category', () => {
            saveCategoryRule('AMAZON PRIME*BRITBOX', 'AMAZON', 'ENTERTAINMENT');

            const rules = getUserCategoryRules();
            expect(rules).toHaveLength(1);
            expect(rules[0]).toEqual({
                pattern: 'AMAZON PRIME*BRITBOX',
                merchant: 'AMAZON',
                category: 'ENTERTAINMENT'
            });
        });

        it('should replace existing rule with same pattern', () => {
            saveCategoryRule('NETFLIX', 'NETFLIX', 'ENTERTAINMENT');
            saveCategoryRule('NETFLIX', 'NETFLIX', 'OTHER');

            const rules = getUserCategoryRules();
            expect(rules).toHaveLength(1);
            expect(rules[0].category).toBe('OTHER');
        });

        it('should store multiple rules with different patterns', () => {
            saveCategoryRule('AMAZON PRIME*BRITBOX', 'AMAZON', 'ENTERTAINMENT');
            saveCategoryRule('AMAZON PRIME*STARZ', 'AMAZON', 'ENTERTAINMENT');

            const rules = getUserCategoryRules();
            expect(rules).toHaveLength(2);
        });
    });

    describe('categorizeMerchant with user rules', () => {
        it('should apply user rule before hardcoded rules', () => {
            // By default, a plain AMAZON transaction matches SHOPPING
            const before = categorizeMerchant('AMZN MKTP 123456');
            expect(before.category).toBe('SHOPPING');

            // Add a user rule for this specific pattern
            saveCategoryRule('AMZN MKTP 123456', 'AMAZON', 'DINING');

            // Now it should match our rule
            const after = categorizeMerchant('AMZN MKTP 123456');
            expect(after.category).toBe('DINING');
        });

        it('should preserve original merchant name from rule', () => {
            saveCategoryRule('AMAZON PRIME*BRITBOX', 'AMAZON', 'ENTERTAINMENT');

            const result = categorizeMerchant('AMAZON PRIME*BRITBOX 123');
            expect(result.merchant).toBe('AMAZON');
            expect(result.category).toBe('ENTERTAINMENT');
        });

        it('should NOT change merchant to display name', () => {
            // This is the key test - we save with original merchant, not display name
            saveCategoryRule('AMAZON PRIME*BRITBOX', 'AMAZON', 'DINING');

            const result = categorizeMerchant('AMAZON PRIME*BRITBOX 123');

            // Merchant should be 'AMAZON', not 'BritBox (Amz)' or similar
            expect(result.merchant).toBe('AMAZON');
            expect(result.merchant).not.toContain('BritBox');
        });

        it('should match rule pattern case-insensitively', () => {
            saveCategoryRule('amazon prime*britbox', 'AMAZON', 'ENTERTAINMENT');

            const result = categorizeMerchant('AMAZON PRIME*BRITBOX 123');
            expect(result.category).toBe('ENTERTAINMENT');
        });
    });

    describe('category sync scenarios', () => {
        it('should allow different subscriptions to have different categories', () => {
            // Save rules for different Amazon subscriptions
            saveCategoryRule('AMAZON PRIME*BRITBOX', 'AMAZON', 'ENTERTAINMENT');
            saveCategoryRule('AMAZON PRIME*STARZ', 'AMAZON', 'ENTERTAINMENT');
            saveCategoryRule('AMAZON.COM*PURCHASE', 'AMAZON', 'SHOPPING');

            // Each should get correct category
            expect(categorizeMerchant('AMAZON PRIME*BRITBOX 123').category).toBe('ENTERTAINMENT');
            expect(categorizeMerchant('AMAZON PRIME*STARZ 456').category).toBe('ENTERTAINMENT');
            expect(categorizeMerchant('AMAZON.COM*PURCHASE 789').category).toBe('SHOPPING');

            // All should keep AMAZON as merchant
            expect(categorizeMerchant('AMAZON PRIME*BRITBOX 123').merchant).toBe('AMAZON');
            expect(categorizeMerchant('AMAZON PRIME*STARZ 456').merchant).toBe('AMAZON');
            expect(categorizeMerchant('AMAZON.COM*PURCHASE 789').merchant).toBe('AMAZON');
        });

        it('should not affect unrelated transactions', () => {
            saveCategoryRule('AMAZON PRIME*BRITBOX', 'AMAZON', 'DINING');

            // Unrelated Amazon transaction should still use default
            const result = categorizeMerchant('AMAZON FRESH GROCERY');
            expect(result.category).toBe('SHOPPING'); // Default for AMAZON
        });
    });

    describe('removeCategoryRule', () => {
        it('should remove rule by pattern', () => {
            saveCategoryRule('NETFLIX', 'NETFLIX', 'ENTERTAINMENT');
            saveCategoryRule('SPOTIFY', 'SPOTIFY', 'ENTERTAINMENT');

            removeCategoryRule('NETFLIX');

            const rules = getUserCategoryRules();
            expect(rules).toHaveLength(1);
            expect(rules[0].pattern).toBe('SPOTIFY');
        });

        it('should restore default categorization after rule removal', () => {
            saveCategoryRule('AMZN MKTP TEST123', 'AMAZON', 'DINING');
            expect(categorizeMerchant('AMZN MKTP TEST123').category).toBe('DINING');

            removeCategoryRule('AMZN MKTP TEST123');

            // Should fall back to default AMAZON/AMZN → SHOPPING
            expect(categorizeMerchant('AMZN MKTP TEST123').category).toBe('SHOPPING');
        });
    });

    describe('getMerchantKey for recurring item matching', () => {
        it('should generate consistent keys for similar descriptions', () => {
            const key1 = getMerchantKey('AMAZON PRIME*BRITBOX 123');
            const key2 = getMerchantKey('AMAZON PRIME*BRITBOX 456');

            // Both should have the same key prefix
            expect(key1).toBe(key2);
        });

        it('should normalize descriptions for matching', () => {
            const key = getMerchantKey('AMAZON PRIME*BRITBOX 123');

            // Should be normalized (uppercase, no special chars, first 8 chars)
            expect(key).toBe('AMAZONPR');
        });
    });
});
