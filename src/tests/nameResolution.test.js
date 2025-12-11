import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMerchantKey, normalizeMerchant } from '../utils/categorize';

/**
 * Integration tests for name resolution - the system that determines
 * what merchant name displays to the user across the app.
 * 
 * This is HIGH RISK code - 6 components depend on it:
 * - TransactionRow.jsx
 * - RecurringItem.jsx
 * - CalendarView.jsx
 * - TransactionTable.jsx
 * - Subscriptions.jsx
 * - TransactionContext.jsx
 * 
 * Resolution priority (highest → lowest):
 * 1. globalRenames[merchantKey]?.displayName
 * 2. sub.displayName  
 * 3. customNames[merchantKey]
 * 4. sub.merchant
 */

describe('Name Resolution System', () => {
    describe('getMerchantKey', () => {
        it('should normalize merchant to 8-char key', () => {
            expect(getMerchantKey('NETFLIX.COM/CA')).toBe('NETFLIXC');
            expect(getMerchantKey('Netflix Subscription')).toBe('NETFLIXS');
        });

        it('should handle Apple variants consistently', () => {
            // These should all generate the same or similar keys for grouping
            const appleKey1 = getMerchantKey('APPLE.COM/BILL');
            const appleKey2 = getMerchantKey('Apple Music');
            const appleKey3 = getMerchantKey('APPLE - Apple TV');

            // All should start with APPLE
            expect(appleKey1.startsWith('APPLE')).toBe(true);
            expect(appleKey2.startsWith('APPLE')).toBe(true);
            expect(appleKey3.startsWith('APPLE')).toBe(true);
        });

        it('should strip special characters', () => {
            expect(getMerchantKey('UBER *TRIP')).toBe('UBERTRIP');
            expect(getMerchantKey('AMAZON.CA/PRIME')).toBe('AMAZONCA');
        });

        it('should handle empty/null input', () => {
            expect(getMerchantKey('')).toBe('');
            expect(getMerchantKey(null)).toBe('');
            expect(getMerchantKey(undefined)).toBe('');
        });
    });

    describe('normalizeMerchant', () => {
        it('should uppercase and clean description', () => {
            expect(normalizeMerchant('Netflix Subscription')).toBe('NETFLIX SUBSCRIPTION');
        });

        it('should remove numbers and special chars', () => {
            expect(normalizeMerchant('UBER *TRIP 12345')).toBe('UBER TRIP');
        });

        it('should limit to 20 chars', () => {
            const result = normalizeMerchant('VERY LONG MERCHANT NAME THAT EXCEEDS LIMIT');
            expect(result.length).toBeLessThanOrEqual(20);
        });
    });

    describe('Effective Name Resolution Logic', () => {
        /**
         * Simulates the resolution logic from TransactionRow.jsx:
         * 
         * const merchantKey = chargeAssignment || getMerchantKey(txn.description);
         * const globalRename = globalRenames[merchantKey];
         * if (globalRename) { return globalRename.displayName; }
         * return txn.merchant;
         */
        function resolveDisplayName(transaction, globalRenames = {}, chargeAssignment = null) {
            const merchantKey = chargeAssignment || getMerchantKey(transaction.description);
            const globalRename = globalRenames[merchantKey];

            if (globalRename?.displayName) {
                return {
                    displayName: globalRename.displayName,
                    isRenamed: true,
                    merchantKey
                };
            }

            return {
                displayName: transaction.merchant,
                isRenamed: false,
                merchantKey
            };
        }

        it('should return original merchant when no rename exists', () => {
            const txn = { description: 'NETFLIX.COM/CA', merchant: 'Netflix' };
            const result = resolveDisplayName(txn);

            expect(result.displayName).toBe('Netflix');
            expect(result.isRenamed).toBe(false);
        });

        it('should return renamed name when globalRename exists', () => {
            const txn = { description: 'APPLE.COM/BILL', merchant: 'Apple' };
            // getMerchantKey('APPLE.COM/BILL') = 'APPLECOM' (8 chars, special chars stripped)
            const globalRenames = {
                'APPLECOM': { displayName: 'Apple TV', originalKey: 'APPLECOM' }
            };

            const result = resolveDisplayName(txn, globalRenames);

            expect(result.displayName).toBe('Apple TV');
            expect(result.isRenamed).toBe(true);
        });

        it('should use chargeAssignment key when provided (split charges)', () => {
            // This tests the split charge scenario where a transaction
            // is assigned to a specific subscription key
            const txn = { description: 'APPLE.COM/BILL', merchant: 'Apple' };
            // getMerchantKey('APPLE.COM/BILL') = 'APPLECOM'
            const globalRenames = {
                'APPLECOM-10.99': { displayName: 'iCloud Storage', originalKey: 'APPLECOM' },
                'APPLECOM': { displayName: 'Apple Music', originalKey: 'APPLECOM' }
            };

            // Without chargeAssignment, uses getMerchantKey
            const resultWithoutAssignment = resolveDisplayName(txn, globalRenames);
            expect(resultWithoutAssignment.merchantKey).toBe('APPLECOM');

            // With chargeAssignment, uses the split key
            const resultWithAssignment = resolveDisplayName(txn, globalRenames, 'APPLECOM-10.99');
            expect(resultWithAssignment.displayName).toBe('iCloud Storage');
            expect(resultWithAssignment.merchantKey).toBe('APPLECOM-10.99');
        });

        it('should not break when globalRenames has entry without displayName', () => {
            const txn = { description: 'NETFLIX.COM', merchant: 'Netflix' };
            const globalRenames = {
                'NETFLIXC': {} // Empty object, no displayName
            };

            const result = resolveDisplayName(txn, globalRenames);

            expect(result.displayName).toBe('Netflix');
            expect(result.isRenamed).toBe(false);
        });
    });

    describe('Split Key Format', () => {
        it('should recognize split key format (merchantKey-amount)', () => {
            const splitKey = 'APPLECO-10.99';
            const parts = splitKey.split('-');

            expect(parts.length).toBe(2);
            expect(parts[0]).toBe('APPLECO');
            expect(parseFloat(parts[1])).toBe(10.99);
        });

        it('should handle merchants with hyphens in name', () => {
            // Edge case: merchant name contains hyphen
            const key = getMerchantKey('BIG-LOTS STORE');
            expect(key).toBe('BIGLOTSS'); // Hyphen stripped
        });
    });

    describe('Search Integration', () => {
        /**
         * Regression test for: Apple TV display issue
         * Search should find transactions by their effective display name
         */
        it('should match transactions by renamed display name', () => {
            const transactions = [
                { id: '1', description: 'APPLE.COM/BILL', merchant: 'Apple', amount: 16.94 },
                { id: '2', description: 'APPLE.COM/BILL', merchant: 'Apple', amount: 10.99 },
                { id: '3', description: 'NETFLIX.COM', merchant: 'Netflix', amount: 15.99 }
            ];

            // getMerchantKey('APPLE.COM/BILL') = 'APPLECOM'
            const globalRenames = {
                'APPLECOM': { displayName: 'Apple TV', originalKey: 'APPLECOM' }
            };

            // Simulate search that should find by display name
            const searchTerm = 'Apple TV';

            const results = transactions.filter(txn => {
                const merchantKey = getMerchantKey(txn.description);
                const displayName = globalRenames[merchantKey]?.displayName || txn.merchant;
                return displayName.toLowerCase().includes(searchTerm.toLowerCase());
            });

            expect(results).toHaveLength(2);
            expect(results.map(r => r.id)).toContain('1');
            expect(results.map(r => r.id)).toContain('2');
        });

        it('should still match by original merchant name', () => {
            const transactions = [
                { id: '1', description: 'APPLE.COM/BILL', merchant: 'Apple', amount: 16.94 }
            ];

            // getMerchantKey('APPLE.COM/BILL') = 'APPLECOM'
            const globalRenames = {
                'APPLECOM': { displayName: 'Apple TV', originalKey: 'APPLECOM' }
            };

            const searchTerm = 'Apple';

            const results = transactions.filter(txn => {
                const merchantKey = getMerchantKey(txn.description);
                const displayName = globalRenames[merchantKey]?.displayName || txn.merchant;
                // Search should match either display name OR original merchant
                return displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    txn.merchant.toLowerCase().includes(searchTerm.toLowerCase());
            });

            expect(results).toHaveLength(1);
        });
    });
});
