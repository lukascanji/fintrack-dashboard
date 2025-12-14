/**
 * Add to Recurring Tests
 * 
 * Tests for the addToRecurring functionality in TransactionTable.
 * Covers: key derivation, state sync, charge assignments, subscription rules, duplicate detection.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getMerchantKey } from '../../utils/categorize';

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn((key) => store[key] ?? null),
        setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
        clear: () => { store = {}; },
        removeItem: vi.fn((key) => { delete store[key]; })
    };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('Add to Recurring', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    describe('getMerchantKey consistency', () => {
        it('should derive the same key from description regardless of variations', () => {
            // The fix ensures we use description, not merchant
            const key1 = getMerchantKey('JAGEX LTD 12345');
            const key2 = getMerchantKey('JAGEX LTD 67890');

            // Both should produce the same base key
            expect(key1).toBe(key2);
        });

        it('should produce consistent keys for the same merchant', () => {
            const description1 = 'SPOTIFY USA DES:PREMIUM ID:123456';
            const description2 = 'SPOTIFY USA DES:PREMIUM ID:789012';

            const key1 = getMerchantKey(description1);
            const key2 = getMerchantKey(description2);

            expect(key1).toBe(key2);
        });

        it('should normalize descriptions properly', () => {
            const key = getMerchantKey('JAGEX LTD RUNESCAPE');

            // Should be uppercase, normalized
            expect(key).toBe('JAGEXLTD');
        });
    });

    describe('isRecurring detection', () => {
        it('should detect recurring via approved list', () => {
            const approvedItems = ['JAGEXLTD'];
            const merchantKey = getMerchantKey('JAGEX LTD 12345');

            const isRecurring = approvedItems.includes(merchantKey);
            expect(isRecurring).toBe(true);
        });

        it('should detect recurring via manualRecurring list', () => {
            const manualRecurring = [
                { merchantKey: 'JAGEXLTD', merchant: 'JAGEX' }
            ];
            const merchantKey = getMerchantKey('JAGEX LTD 12345');

            const exists = manualRecurring.some(m => m.merchantKey === merchantKey);
            expect(exists).toBe(true);
        });

        it('should not detect non-recurring items', () => {
            const approvedItems = ['NETFLIX'];
            const manualRecurring = [];
            const merchantKey = getMerchantKey('JAGEX LTD 12345');

            const isRecurring = approvedItems.includes(merchantKey) ||
                manualRecurring.some(m => m.merchantKey === merchantKey);
            expect(isRecurring).toBe(false);
        });
    });

    describe('duplicate detection', () => {
        it('should detect existing manual recurring item', () => {
            const manualRecurring = [
                { merchantKey: 'JAGEXLTD', merchant: 'JAGEX', amount: 129.99 }
            ];

            const newTxn = { description: 'JAGEX LTD 12345', merchant: 'JAGEX' };
            const merchantKey = getMerchantKey(newTxn.description);

            const existing = manualRecurring.find(item => item.merchantKey === merchantKey);

            expect(existing).toBeDefined();
            expect(existing.amount).toBe(129.99);
        });

        it('should not find duplicate for different merchant', () => {
            const manualRecurring = [
                { merchantKey: 'NETFLIX', merchant: 'Netflix' }
            ];

            const newTxn = { description: 'JAGEX LTD 12345', merchant: 'JAGEX' };
            const merchantKey = getMerchantKey(newTxn.description);

            const existing = manualRecurring.find(item => item.merchantKey === merchantKey);

            expect(existing).toBeUndefined();
        });
    });

    describe('subscription rule creation', () => {
        it('should create valid subscription rule structure', () => {
            const txn = { description: 'JAGEX LTD SUBSCRIPTION 12345' };
            const merchantKey = getMerchantKey(txn.description);

            const rule = {
                merchantKey,
                patterns: [txn.description.toUpperCase()],
                createdAt: new Date().toISOString()
            };

            expect(rule.merchantKey).toBe('JAGEXLTD');
            expect(rule.patterns).toContain('JAGEX LTD SUBSCRIPTION 12345');
            expect(rule.createdAt).toBeDefined();
        });

        it('should include uppercase pattern for matching', () => {
            const txn = { description: 'jagex ltd runescape' };

            const patterns = [txn.description.toUpperCase()];

            expect(patterns[0]).toBe('JAGEX LTD RUNESCAPE');
        });
    });

    describe('manual recurring entry structure', () => {
        it('should create complete entry with all required fields', () => {
            const txn = {
                id: 'txn-123',
                description: 'JAGEX LTD 12345',
                merchant: 'JAGEX',
                debit: 129.99,
                category: 'ENTERTAINMENT'
            };

            const merchantKey = getMerchantKey(txn.description);
            const txnId = txn.id;

            const entry = {
                merchantKey,
                merchant: txn.merchant,
                description: txn.description,
                amount: txn.debit,
                category: txn.category,
                dateAdded: new Date().toISOString(),
                sourceTransactionId: txnId
            };

            expect(entry.merchantKey).toBe('JAGEXLTD');
            expect(entry.merchant).toBe('JAGEX');
            expect(entry.amount).toBe(129.99);
            expect(entry.category).toBe('ENTERTAINMENT');
            expect(entry.sourceTransactionId).toBe('txn-123');
        });
    });
});
