import { describe, it, expect } from 'vitest';
import {
    applyRulesToTransactions,
    generateSubscriptionRules
} from '../../utils/ruleEngine';

describe('ruleEngine', () => {
    describe('applyRulesToTransactions', () => {
        const mockRules = {
            subscriptionRules: {
                'import_disney+_123': {
                    serviceName: 'Disney+',
                    affiliation: 'APPLE',
                    billingDay: 19,
                    amounts: [16.94, 18.07],
                    targetKey: 'import_disney+_123'
                }
            }
        };

        it('matches transaction by affiliation and amount', () => {
            const transactions = [{
                date: new Date(2024, 0, 19), // Jan 19
                description: 'APPLE.COM/BILL 800-123',
                debit: 16.94
            }];

            const result = applyRulesToTransactions(transactions, mockRules);
            expect(Object.keys(result.chargeAssignments).length).toBe(1);
            expect(result.appliedRules.subscriptions.length).toBe(1);
        });

        it('matches with fuzzy amount (within 3%)', () => {
            const transactions = [{
                date: new Date(2024, 0, 19),
                description: 'APPLE.COM/BILL',
                debit: 17.20 // ~1.5% higher than 16.94
            }];

            const result = applyRulesToTransactions(transactions, mockRules);
            expect(Object.keys(result.chargeAssignments).length).toBe(1);
        });

        it('does not match wrong affiliation', () => {
            const transactions = [{
                date: new Date(2024, 0, 19),
                description: 'AMAZON PRIME',
                debit: 16.94
            }];

            const result = applyRulesToTransactions(transactions, mockRules);
            expect(Object.keys(result.chargeAssignments).length).toBe(0);
        });

        it('does not match wrong amount', () => {
            const transactions = [{
                date: new Date(2024, 0, 19),
                description: 'APPLE.COM/BILL',
                debit: 10.99 // Wrong amount
            }];

            const result = applyRulesToTransactions(transactions, mockRules);
            expect(Object.keys(result.chargeAssignments).length).toBe(0);
        });

        it('matches billing day with tolerance', () => {
            const transactions = [{
                date: new Date(2024, 0, 22), // 3 days after billing day
                description: 'APPLE.COM/BILL',
                debit: 16.94
            }];

            const result = applyRulesToTransactions(transactions, mockRules);
            expect(Object.keys(result.chargeAssignments).length).toBe(1);
        });

        it('does not match if day is too far from billing day', () => {
            const transactions = [{
                date: new Date(2024, 0, 10), // 9 days before billing day
                description: 'APPLE.COM/BILL',
                debit: 16.94
            }];

            const result = applyRulesToTransactions(transactions, mockRules);
            expect(Object.keys(result.chargeAssignments).length).toBe(0);
        });

        it('skips already-assigned transactions', () => {
            const transactions = [{
                date: new Date(2024, 0, 19),
                description: 'APPLE.COM/BILL',
                debit: 16.94,
                id: 'existing-txn-id' // Add explicit ID
            }];

            const existingAssignments = {
                'existing-txn-id': 'other_key' // Use the explicit ID
            };

            const result = applyRulesToTransactions(transactions, mockRules, existingAssignments);
            expect(Object.keys(result.chargeAssignments).length).toBe(0);
        });
    });

    describe('generateSubscriptionRules', () => {
        it('generates rules from import data', () => {
            const importData = {
                manualRecurringEntries: [{
                    merchantKey: 'import_disney+_123',
                    merchant: 'Disney+'
                }]
            };

            const parsedSubscriptions = [{
                serviceName: 'Disney+',
                affiliation: 'APPLE',
                billingDay: 19,
                priceHistory: [
                    { amount: 16.94, month: 0, year: 2024 },
                    { amount: 18.07, month: 10, year: 2024 }
                ]
            }];

            const rules = generateSubscriptionRules(importData, parsedSubscriptions);

            expect(rules['import_disney+_123']).toBeDefined();
            expect(rules['import_disney+_123'].serviceName).toBe('Disney+');
            expect(rules['import_disney+_123'].affiliation).toBe('APPLE');
            expect(rules['import_disney+_123'].billingDay).toBe(19);
            expect(rules['import_disney+_123'].amounts).toContain(16.94);
            expect(rules['import_disney+_123'].amounts).toContain(18.07);
        });

        it('returns empty object if no matching subscriptions', () => {
            const importData = {
                manualRecurringEntries: [{
                    merchantKey: 'import_netflix_123',
                    merchant: 'Netflix'
                }]
            };

            const parsedSubscriptions = [{
                serviceName: 'Disney+', // Different name
                affiliation: 'APPLE',
                billingDay: 19,
                priceHistory: []
            }];

            const rules = generateSubscriptionRules(importData, parsedSubscriptions);
            expect(Object.keys(rules).length).toBe(0);
        });
    });
});
