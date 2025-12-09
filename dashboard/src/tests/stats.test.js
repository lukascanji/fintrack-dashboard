import { describe, it, expect } from 'vitest';
import { calculateStats } from '../utils/stats';

describe('calculateStats', () => {
    it('should return zero stats for empty transactions', () => {
        const result = calculateStats([]);
        expect(result).toEqual({
            totalSpend: 0,
            totalIncome: 0,
            netFlow: 0,
            avgMonthlySpend: 0,
            transactionCount: 0,
            monthlyData: [],
            categoryBreakdown: {},
            merchantBreakdown: {}
        });
    });

    it('should calculate basic totals correctly', () => {
        const transactions = [
            { date: new Date('2024-01-01'), debit: 100, credit: 0, category: 'GROCERIES', merchant: 'Metro' },
            { date: new Date('2024-01-02'), debit: 50, credit: 0, category: 'DINING', merchant: 'Uber' },
            { date: new Date('2024-01-03'), debit: 0, credit: 1000, category: 'INCOME', merchant: 'Payroll' }
        ];

        const result = calculateStats(transactions);
        expect(result.totalSpend).toBe(150);
        expect(result.totalIncome).toBe(1000);
        expect(result.netFlow).toBe(850);
        expect(result.transactionCount).toBe(3);
    });

    it('should exclude TRANSFERS from spending', () => {
        const transactions = [
            { date: new Date('2024-01-01'), debit: 100, credit: 0, category: 'TRANSFER', merchant: 'E-Transfer' },
            { date: new Date('2024-01-02'), debit: 50, credit: 0, category: 'DINING', merchant: 'Uber' }
        ];

        const result = calculateStats(transactions);
        expect(result.totalSpend).toBe(50); // Should exclude the 100 transfer
    });

    it('should calculate category breakdown', () => {
        const transactions = [
            { date: new Date('2024-01-01'), debit: 100, credit: 0, category: 'GROCERIES' },
            { date: new Date('2024-01-02'), debit: 50, credit: 0, category: 'GROCERIES' },
            { date: new Date('2024-01-03'), debit: 30, credit: 0, category: 'DINING' }
        ];

        const result = calculateStats(transactions);
        expect(result.categoryBreakdown).toEqual({
            'GROCERIES': 150,
            'DINING': 30
        });
    });
});
