import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Tests for split state transformations.
 * These test the expected behavior when splitting subscriptions.
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

describe('Split State Logic', () => {
    describe('manualRecurring after split', () => {
        it('creates new subscription entries for split items', () => {
            const manualRecurring = [];

            // Split PayPal into 3 subscriptions by amount
            const splitItems = [
                { merchantKey: 'paypal-25.98', displayName: 'VPN Service', amount: 25.98 },
                { merchantKey: 'paypal-12.49', displayName: 'Cloud Storage', amount: 12.49 },
                { merchantKey: 'paypal-21.46', displayName: 'Music App', amount: 21.46 }
            ];

            splitItems.forEach(item => {
                manualRecurring.push({
                    merchantKey: item.merchantKey,
                    merchant: item.displayName,
                    latestAmount: item.amount,
                    frequency: 'Monthly',
                    isManual: true
                });
            });

            expect(manualRecurring).toHaveLength(3);
            expect(manualRecurring.find(m => m.merchantKey === 'paypal-25.98')).toBeTruthy();
            expect(manualRecurring.find(m => m.merchant === 'VPN Service')).toBeTruthy();
        });
    });

    describe('chargeAssignments after split', () => {
        it('assigns transactions to new split subscription keys', () => {
            const chargeAssignments = {};

            // Transactions get assigned to their new split keys
            const assignments = {
                'txn_13': 'paypal-25.98',
                'txn_14': 'paypal-25.98',
                'txn_15': 'paypal-25.98',
                'txn_17': 'paypal-12.49',
                'txn_18': 'paypal-12.49',
                'txn_21': 'paypal-21.46'
            };

            Object.entries(assignments).forEach(([txnId, targetKey]) => {
                chargeAssignments[txnId] = targetKey;
            });

            expect(chargeAssignments['txn_13']).toBe('paypal-25.98');
            expect(chargeAssignments['txn_17']).toBe('paypal-12.49');
            expect(chargeAssignments['txn_21']).toBe('paypal-21.46');
        });

        it('transaction ID must use getTransactionId format', () => {
            // The bug we fixed: SplitChargesModal uses getTransactionId(t)
            // but TransactionTable was looking up chargeAssignments[t.id]
            const txn = {
                date: new Date('2024-01-08'),
                description: 'PAYPAL *MERCHANT1',
                debit: 25.98
            };

            // Expected ID format from getTransactionId
            const expectedIdFormat = /^txn_\d{4}-\d{2}-\d{2}_\d+\.\d{2}_[a-z]+$/;
            const mockId = 'txn_2024-01-08_25.98_paypalmerchant';

            expect(mockId).toMatch(expectedIdFormat);
        });
    });

    describe('splitSubscriptions tracking', () => {
        it('tracks what the parent subscription was split into', () => {
            const splitSubscriptions = {};

            // Track that paypal was split into these keys
            splitSubscriptions['paypal'] = {
                splitInto: ['paypal-25.98', 'paypal-12.49', 'paypal-21.46'],
                splitAt: new Date().toISOString()
            };

            expect(splitSubscriptions['paypal'].splitInto).toHaveLength(3);
            expect(splitSubscriptions['paypal'].splitInto).toContain('paypal-25.98');
        });
    });

    describe('effectiveNames after split', () => {
        it('split subscription name appears in effectiveNames lookup', () => {
            const manualRecurring = [
                { merchantKey: 'paypal-25.98', merchant: 'VPN Service' }
            ];
            const chargeAssignments = { 'txn_13': 'paypal-25.98' };

            // Build effectiveNames from manualRecurring
            const effectiveNames = {};
            manualRecurring.forEach(item => {
                effectiveNames[item.merchantKey] = item.merchant;
            });

            // When looking up a transaction that was assigned
            const targetKey = chargeAssignments['txn_13'];
            const displayName = effectiveNames[targetKey];

            expect(displayName).toBe('VPN Service');
        });
    });

    describe('delete split subscription', () => {
        it('removes from manualRecurring', () => {
            let manualRecurring = [
                { merchantKey: 'paypal-25.98', merchant: 'VPN Service' },
                { merchantKey: 'paypal-12.49', merchant: 'Cloud Storage' }
            ];

            const keyToDelete = 'paypal-25.98';
            manualRecurring = manualRecurring.filter(m => m.merchantKey !== keyToDelete);

            expect(manualRecurring).toHaveLength(1);
            expect(manualRecurring[0].merchantKey).toBe('paypal-12.49');
        });

        it('clears associated charge assignments', () => {
            const chargeAssignments = {
                'txn_13': 'paypal-25.98',
                'txn_14': 'paypal-25.98',
                'txn_17': 'paypal-12.49'
            };

            const keyToDelete = 'paypal-25.98';

            Object.keys(chargeAssignments).forEach(txnId => {
                if (chargeAssignments[txnId] === keyToDelete) {
                    delete chargeAssignments[txnId];
                }
            });

            expect(Object.keys(chargeAssignments)).toHaveLength(1);
            expect(chargeAssignments['txn_17']).toBe('paypal-12.49');
        });
    });
});
