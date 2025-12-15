import { describe, it, expect } from 'vitest';
import {
    getTransactionId,
    buildEffectiveNamesMap,
    resolveEffectiveMerchant,
    resolveEffectiveCategory,
    enrichTransaction,
    enrichTransactions
} from '../../utils/effectiveNameResolver';

describe('effectiveNameResolver', () => {
    describe('getTransactionId', () => {
        it('returns existing id if present', () => {
            const txn = { id: 'existing-123', date: new Date(), description: 'TEST' };
            expect(getTransactionId(txn)).toBe('existing-123');
        });

        it('generates consistent id from date, amount, and description', () => {
            const txn = {
                date: new Date('2024-01-15'),
                description: 'NETFLIX.COM',
                debit: 15.99
            };
            const id1 = getTransactionId(txn);
            const id2 = getTransactionId(txn);
            expect(id1).toBe(id2);
            expect(id1).toMatch(/^txn_2024-01-15_15\.99_/);
        });
    });

    describe('buildEffectiveNamesMap', () => {
        it('builds map from manualRecurring', () => {
            const metadata = {
                manualRecurring: [
                    { merchantKey: 'netflix', displayName: 'Netflix Premium' }
                ],
                globalRenames: {},
                mergedSubscriptions: {}
            };
            const map = buildEffectiveNamesMap(metadata);
            expect(map['netflix']).toBe('Netflix Premium');
        });

        it('globalRenames takes priority over mergedSubscriptions', () => {
            const metadata = {
                manualRecurring: [],
                mergedSubscriptions: {
                    'streaming': { displayName: 'Merged Streaming' }
                },
                globalRenames: {
                    'streaming': { displayName: 'Renamed Streaming' }
                }
            };
            const map = buildEffectiveNamesMap(metadata);
            expect(map['streaming']).toBe('Renamed Streaming');
        });

        it('handles string renames (legacy format)', () => {
            const metadata = {
                manualRecurring: [],
                mergedSubscriptions: {},
                globalRenames: {
                    'netflix': 'Netflix HD'
                }
            };
            const map = buildEffectiveNamesMap(metadata);
            expect(map['netflix']).toBe('Netflix HD');
        });
    });

    describe('resolveEffectiveMerchant', () => {
        it('returns raw merchant when no overrides exist', () => {
            const txn = {
                description: 'SOME RANDOM STORE 123',
                merchant: 'SOME RANDOM STORE',
                debit: 50.00
            };
            const result = resolveEffectiveMerchant(txn, {});
            expect(result).toBe('SOME RANDOM STORE');
        });

        it('returns globalRename displayName when exists', () => {
            const txn = {
                description: 'NETFLIX.COM 12345',
                merchant: 'NETFLIX',
                debit: 15.99
            };
            const metadata = {
                globalRenames: {
                    'NETFLIXC': { displayName: 'Netflix Premium' }
                }
            };
            const result = resolveEffectiveMerchant(txn, metadata);
            expect(result).toBe('Netflix Premium');
        });

        it('checks amount-suffixed key first', () => {
            const txn = {
                description: 'PAYPAL *MERCHANT1',
                merchant: 'PAYPAL',
                debit: 25.98
            };
            const metadata = {
                globalRenames: {
                    'PAYPALME-25.98': { displayName: 'VPN Service' },
                    'PAYPALME': { displayName: 'PayPal Generic' }
                }
            };
            const result = resolveEffectiveMerchant(txn, metadata);
            expect(result).toBe('VPN Service');
        });

        it('falls back to base key when amount key not found', () => {
            const txn = {
                description: 'PAYPAL *MERCHANT1',
                merchant: 'PAYPAL',
                debit: 99.99
            };
            const metadata = {
                globalRenames: {
                    'PAYPALME': { displayName: 'PayPal Generic' }
                }
            };
            const result = resolveEffectiveMerchant(txn, metadata);
            expect(result).toBe('PayPal Generic');
        });

        it('uses chargeAssignment when present', () => {
            const txn = {
                id: 'txn-123',
                description: 'AMAZON PRIME*SOMETHING',
                merchant: 'AMAZON',
                debit: 8.99
            };
            const metadata = {
                chargeAssignments: {
                    'txn-123': 'britbox'
                },
                manualRecurring: [
                    { merchantKey: 'britbox', displayName: 'BritBox Streaming' }
                ],
                globalRenames: {},
                mergedSubscriptions: {}
            };
            const result = resolveEffectiveMerchant(txn, metadata);
            expect(result).toBe('BritBox Streaming');
        });

        it('returns mergedSubscription displayName', () => {
            const txn = {
                description: 'NETFLIX.COM',
                merchant: 'NETFLIX',
                debit: 15.99
            };
            const metadata = {
                mergedSubscriptions: {
                    'NETFLIXC': { displayName: 'Streaming Bundle' }
                }
            };
            const result = resolveEffectiveMerchant(txn, metadata);
            expect(result).toBe('Streaming Bundle');
        });
    });

    describe('resolveEffectiveCategory', () => {
        it('returns transaction category when no override', () => {
            const txn = {
                description: 'NETFLIX',
                category: 'ENTERTAINMENT',
                debit: 15.99
            };
            const result = resolveEffectiveCategory(txn, {});
            expect(result).toBe('ENTERTAINMENT');
        });

        it('returns override category when present', () => {
            const txn = {
                description: 'SOME MERCHANT',
                category: 'OTHER',
                debit: 50.00
            };
            const metadata = {
                categoryOverrides: {
                    'SOMEMERC': 'ENTERTAINMENT'
                }
            };
            const result = resolveEffectiveCategory(txn, metadata);
            expect(result).toBe('ENTERTAINMENT');
        });
    });

    describe('enrichTransaction', () => {
        it('adds effectiveMerchant and effectiveCategory', () => {
            const txn = {
                description: 'NETFLIX.COM 12345',
                merchant: 'NETFLIX',
                category: 'ENTERTAINMENT',
                debit: 15.99
            };
            const metadata = {
                globalRenames: {
                    'NETFLIXC': { displayName: 'Netflix Premium' }
                }
            };
            const result = enrichTransaction(txn, metadata);
            expect(result.effectiveMerchant).toBe('Netflix Premium');
            expect(result.effectiveCategory).toBe('ENTERTAINMENT');
            expect(result.merchant).toBe('NETFLIX'); // Original preserved
        });
    });

    describe('enrichTransactions', () => {
        it('enriches all transactions in array', () => {
            const transactions = [
                { description: 'NETFLIX.COM', merchant: 'NETFLIX', category: 'ENTERTAINMENT', debit: 15.99 },
                { description: 'SPOTIFY USA', merchant: 'SPOTIFY', category: 'ENTERTAINMENT', debit: 9.99 }
            ];
            const metadata = {
                globalRenames: {
                    'NETFLIXC': { displayName: 'Netflix HD' }
                }
            };
            const result = enrichTransactions(transactions, metadata);
            expect(result).toHaveLength(2);
            expect(result[0].effectiveMerchant).toBe('Netflix HD');
            expect(result[1].effectiveMerchant).toBe('SPOTIFY'); // No rename
        });

        it('returns empty array for empty input', () => {
            const result = enrichTransactions([], {});
            expect(result).toEqual([]);
        });

        it('returns empty array for null input', () => {
            const result = enrichTransactions(null, {});
            expect(result).toEqual([]);
        });
    });
});
