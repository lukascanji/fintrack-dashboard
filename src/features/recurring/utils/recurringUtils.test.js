import { describe, it, expect } from 'vitest';
import { detectSubscriptions, amountsMatch } from './recurringUtils';

describe('recurringUtils', () => {
    describe('amountsMatch', () => {
        it('should return true for identical amounts', () => {
            expect(amountsMatch(10.00, 10.00)).toBe(true);
        });

        it('should return true for amounts within 3%', () => {
            expect(amountsMatch(100.00, 102.50)).toBe(true); // 2.5% diff
            expect(amountsMatch(100.00, 97.50)).toBe(true);  // 2.5% diff
        });

        it('should return false for amounts outside 3%', () => {
            expect(amountsMatch(100.00, 104.00)).toBe(false);
            expect(amountsMatch(100.00, 96.00)).toBe(false);
        });
    });

    describe('detectSubscriptions', () => {
        it('should detect a simple monthly subscription', () => {
            const transactions = [
                { date: new Date('2024-01-01'), amount: 15.00, merchant: 'Netflix', description: 'Netflix', debit: 15.00 },
                { date: new Date('2024-02-01'), amount: 15.00, merchant: 'Netflix', description: 'Netflix', debit: 15.00 },
                { date: new Date('2024-03-01'), amount: 15.00, merchant: 'Netflix', description: 'Netflix', debit: 15.00 },
                { date: new Date('2024-04-01'), amount: 15.00, merchant: 'Netflix', description: 'Netflix', debit: 15.00 },
            ];

            const result = detectSubscriptions(transactions);
            expect(result).toHaveLength(1);
            expect(result[0].merchant).toBe('Netflix');
            expect(result[0].frequency).toBe('Monthly');
        });

        it('should label irregular patterns as Frequent instead of ignoring', () => {
            // Same merchant+amount but very long irregular interval (not matching any pattern)
            const transactions = [
                { date: new Date('2024-01-01'), amount: 15.00, merchant: 'Uber', description: 'Uber', debit: 15.00 },
                { date: new Date('2024-01-03'), amount: 15.00, merchant: 'Uber', description: 'Uber', debit: 15.00 },
                // 2-day interval doesn't match any frequency pattern (weekly is 5-10, etc)
            ];

            const result = detectSubscriptions(transactions);
            expect(result).toHaveLength(1);
            expect(result[0].merchant).toBe('Uber');
            expect(result[0].frequency).toBe('Frequent'); // Falls through all patterns
        });

        it('should handle fuzzy amounts for subscriptions', () => {
            const transactions = [
                { date: new Date('2024-01-01'), amount: 100.00, merchant: 'Hydro', description: 'Hydro', debit: 100.00 },
                { date: new Date('2024-02-01'), amount: 102.00, merchant: 'Hydro', description: 'Hydro', debit: 102.00 },
                { date: new Date('2024-03-01'), amount: 99.50, merchant: 'Hydro', description: 'Hydro', debit: 99.50 },
                { date: new Date('2024-04-01'), amount: 101.20, merchant: 'Hydro', description: 'Hydro', debit: 101.20 },
            ];

            const result = detectSubscriptions(transactions);
            expect(result).toHaveLength(1);
            expect(result[0].merchant).toBe('Hydro');
            expect(result[0].frequency).toBe('Monthly');
        });

        it('should detect semi-monthly patterns as Bi-Weekly (user can split later)', () => {
            // Charges on 5th and 18th of each month - avg interval ~15 days fits Bi-Weekly
            const transactions = [
                { date: new Date('2024-01-05'), amount: 12.42, merchant: 'Amazon', description: 'AMAZON', debit: 12.42 },
                { date: new Date('2024-01-18'), amount: 12.42, merchant: 'Amazon', description: 'AMAZON', debit: 12.42 },
                { date: new Date('2024-02-05'), amount: 12.42, merchant: 'Amazon', description: 'AMAZON', debit: 12.42 },
                { date: new Date('2024-02-18'), amount: 12.42, merchant: 'Amazon', description: 'AMAZON', debit: 12.42 },
            ];

            const result = detectSubscriptions(transactions);
            expect(result).toHaveLength(1);
            expect(result[0].frequency).toBe('Bi-Weekly'); // Detects as Bi-Weekly, user can split
            expect(result[0].count).toBe(4);
        });
    });
});
