import { describe, it, expect } from 'vitest';
import { getTransactionId } from '../../utils/transactionId';

describe('getTransactionId', () => {
    it('returns existing ID if present', () => {
        const txn = { id: 'existing-id', date: new Date('2024-01-01'), description: 'TEST', debit: 10 };
        expect(getTransactionId(txn)).toBe('existing-id');
    });

    it('generates consistent ID for same transaction', () => {
        const txn = { date: new Date('2024-01-15'), description: 'NETFLIX.COM', debit: 15.99 };
        const id1 = getTransactionId(txn);
        const id2 = getTransactionId(txn);
        expect(id1).toBe(id2);
    });

    it('generates different IDs for different transactions', () => {
        const txn1 = { date: new Date('2024-01-15'), description: 'NETFLIX.COM', debit: 15.99 };
        const txn2 = { date: new Date('2024-01-15'), description: 'SPOTIFY.COM', debit: 9.99 };
        expect(getTransactionId(txn1)).not.toBe(getTransactionId(txn2));
    });

    it('generates different IDs for same merchant different dates', () => {
        const txn1 = { date: new Date('2024-01-15'), description: 'NETFLIX.COM', debit: 15.99 };
        const txn2 = { date: new Date('2024-02-15'), description: 'NETFLIX.COM', debit: 15.99 };
        expect(getTransactionId(txn1)).not.toBe(getTransactionId(txn2));
    });

    it('handles string dates', () => {
        const txn = { date: '2024-01-15', description: 'NETFLIX.COM', debit: 15.99 };
        const id = getTransactionId(txn);
        // Date string parsing may vary by timezone, just verify we get a date format
        expect(id).toMatch(/txn_\d{4}-\d{2}-\d{2}_/);
    });

    it('handles credit field instead of debit', () => {
        const txn = { date: new Date('2024-01-15'), description: 'E-TRANSFER', credit: 500 };
        const id = getTransactionId(txn);
        expect(id).toContain('500.00');
    });

    it('handles amount field', () => {
        const txn = { date: new Date('2024-01-15'), description: 'PURCHASE', amount: 25.50 };
        const id = getTransactionId(txn);
        expect(id).toContain('25.50');
    });

    it('normalizes description for consistent hashing', () => {
        const txn1 = { date: new Date('2024-01-15'), description: 'NETFLIX.COM #123', debit: 15.99 };
        const txn2 = { date: new Date('2024-01-15'), description: 'NETFLIXCOM123', debit: 15.99 };
        // Both should produce same ID since special chars are stripped
        expect(getTransactionId(txn1)).toBe(getTransactionId(txn2));
    });

    it('handles missing date gracefully', () => {
        const txn = { description: 'TEST', debit: 10 };
        expect(() => getTransactionId(txn)).not.toThrow();
    });
});
