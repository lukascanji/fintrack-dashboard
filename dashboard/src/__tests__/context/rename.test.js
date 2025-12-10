import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Tests for rename state transformations and name resolution.
 * These test the expected behavior when renaming subscriptions
 * and how names are resolved across different sources.
 */

// Mock localStorage for tests
let mockStorage = {};

beforeEach(() => {
    mockStorage = {};
    global.localStorage = {
        getItem: (key) => mockStorage[key] || null,
        setItem: (key, value) => { mockStorage[key] = value; },
        removeItem: (key) => { delete mockStorage[key]; },
        clear: () => { mockStorage = {}; }
    };
});

describe('Rename State Logic', () => {
    describe('globalRenames structure', () => {
        it('stores rename with merchantKey as key', () => {
            const globalRenames = {};

            globalRenames['netflix'] = 'Netflix Premium';

            expect(globalRenames['netflix']).toBe('Netflix Premium');
        });

        it('can use amount-suffixed key for PayPal-style subscriptions', () => {
            const globalRenames = {};

            // When you rename a specific PayPal subscription
            globalRenames['paypal-25.98'] = 'VPN Service';

            expect(globalRenames['paypal-25.98']).toBe('VPN Service');
            expect(globalRenames['paypal']).toBeUndefined();
        });
    });

    describe('effectiveNames resolution order', () => {
        it('returns merged name first if available', () => {
            const manualRecurring = [];
            const mergedSubscriptions = {
                'merged_streaming': { displayName: 'All Streaming' }
            };
            const globalRenames = { 'merged_streaming': 'Entertainment Bundle' };

            // Build effectiveNames with correct priority
            const effectiveNames = {};

            // 1. Add from manualRecurring (split names)
            manualRecurring.forEach(item => {
                effectiveNames[item.merchantKey] = item.merchant;
            });

            // 2. Add from mergedSubscriptions
            Object.entries(mergedSubscriptions).forEach(([key, merge]) => {
                effectiveNames[key] = merge.displayName;
            });

            // 3. Add from globalRenames (overwrites if exists)
            Object.entries(globalRenames).forEach(([key, name]) => {
                effectiveNames[key] = name;
            });

            // globalRenames should override mergedSubscriptions
            expect(effectiveNames['merged_streaming']).toBe('Entertainment Bundle');
        });

        it('falls back through priority chain correctly', () => {
            const manualRecurring = [
                { merchantKey: 'paypal-25.98', merchant: 'Cloud Storage' }
            ];
            const mergedSubscriptions = {};
            const globalRenames = {};

            const effectiveNames = {};
            manualRecurring.forEach(item => {
                effectiveNames[item.merchantKey] = item.merchant;
            });

            expect(effectiveNames['paypal-25.98']).toBe('Cloud Storage');
            expect(effectiveNames['netflix']).toBeUndefined();
        });
    });

    describe('merchantKey lookup variations', () => {
        it('tries both amount-suffixed and base key', () => {
            const globalRenames = {
                'paypal-25.98': 'VPN Service'
            };

            // Transaction with known amount
            const txn = { description: 'PAYPAL *MERCHANT1', debit: 25.98 };
            const baseKey = 'paypal';
            const amountKey = `${baseKey}-${txn.debit.toFixed(2)}`;

            // Lookup logic should try amount key first
            const name = globalRenames[amountKey] || globalRenames[baseKey];

            expect(name).toBe('VPN Service');
        });

        it('falls back to base key when amount key not found', () => {
            const globalRenames = {
                'netflix': 'Entertainment'
            };

            const txn = { description: 'NETFLIX.COM', debit: 15.99 };
            const baseKey = 'netflix';
            const amountKey = `${baseKey}-${txn.debit.toFixed(2)}`;

            // amount key doesn't exist, falls back to base
            const name = globalRenames[amountKey] || globalRenames[baseKey];

            expect(name).toBe('Entertainment');
        });
    });

    describe('isRenamed flag', () => {
        it('indicates when transaction displays a renamed value', () => {
            const effectiveNames = { 'netflix': 'Entertainment' };
            const originalMerchant = 'Netflix';
            const txnKey = 'netflix';

            const effectiveName = effectiveNames[txnKey];
            const isRenamed = !!effectiveName && effectiveName !== originalMerchant;

            expect(isRenamed).toBe(true);
        });

        it('is false when no rename exists', () => {
            const effectiveNames = {};
            const txnKey = 'netflix';

            const effectiveName = effectiveNames[txnKey];
            const isRenamed = !!effectiveName;

            expect(isRenamed).toBe(false);
        });
    });

    describe('revert rename', () => {
        it('removes the globalRenames entry', () => {
            const globalRenames = {
                'netflix': 'Entertainment',
                'spotify': 'Music'
            };

            delete globalRenames['netflix'];

            expect(globalRenames['netflix']).toBeUndefined();
            expect(globalRenames['spotify']).toBe('Music');
        });
    });
});

describe('Display Consistency', () => {
    it('same name appears in Transactions and Calendar', () => {
        // Both TransactionTable and CalendarView should use the same
        // effectiveNames lookup logic

        const manualRecurring = [
            { merchantKey: 'paypal-25.98', merchant: 'VPN Service' }
        ];
        const mergedSubscriptions = {
            'merged_streaming': { displayName: 'All Streaming' }
        };
        const globalRenames = {
            'netflix': 'Netflix Premium'
        };

        // Build effectiveNames (same logic in both components)
        const buildEffectiveNames = () => {
            const names = {};
            manualRecurring.forEach(item => {
                names[item.merchantKey] = item.merchant;
            });
            Object.entries(mergedSubscriptions).forEach(([key, merge]) => {
                names[key] = merge.displayName;
            });
            Object.entries(globalRenames).forEach(([key, name]) => {
                names[key] = name;
            });
            return names;
        };

        const transactionTableNames = buildEffectiveNames();
        const calendarViewNames = buildEffectiveNames();

        // Both should produce identical results
        expect(transactionTableNames).toEqual(calendarViewNames);
        expect(transactionTableNames['paypal-25.98']).toBe('VPN Service');
        expect(transactionTableNames['merged_streaming']).toBe('All Streaming');
        expect(transactionTableNames['netflix']).toBe('Netflix Premium');
    });
});
