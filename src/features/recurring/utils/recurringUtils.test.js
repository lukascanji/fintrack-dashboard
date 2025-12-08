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

        it('should ignore sporadic transactions', () => {
            const transactions = [
                { date: new Date('2024-01-01'), amount: 15.00, merchant: 'Uber', description: 'Uber', debit: 15.00 },
                { date: new Date('2024-01-15'), amount: 22.00, merchant: 'Uber', description: 'Uber', debit: 22.00 },
                { date: new Date('2024-06-01'), amount: 14.00, merchant: 'Uber', description: 'Uber', debit: 14.00 },
            ];

            const result = detectSubscriptions(transactions);
            expect(result).toHaveLength(0);
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
    });
});
