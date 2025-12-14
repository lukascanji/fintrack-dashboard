import { describe, it, expect } from 'vitest';
import {
    matchesAffiliation,
    matchesBillingDate,
    DEFAULT_AFFILIATION_PATTERNS
} from '../../utils/subscriptionMatcher';

describe('subscriptionMatcher', () => {
    describe('matchesAffiliation', () => {
        it('matches AMAZON transactions', () => {
            const txn = { description: 'AMAZON PRIME*1234' };
            expect(matchesAffiliation(txn, 'AMAZON')).toBe(true);
        });

        it('matches AMZN pattern for AMAZON', () => {
            const txn = { description: 'AMZN MKTP US*5678' };
            expect(matchesAffiliation(txn, 'AMAZON')).toBe(true);
        });

        it('matches APPLE transactions', () => {
            const txn = { description: 'APPLE.COM/BILL CUPERTINO' };
            expect(matchesAffiliation(txn, 'APPLE')).toBe(true);
        });

        it('matches ITUNES for APPLE', () => {
            const txn = { description: 'ITUNES.COM/BILL 800-' };
            expect(matchesAffiliation(txn, 'APPLE')).toBe(true);
        });

        it('matches PAYPAL transactions', () => {
            const txn = { description: 'PAYPAL *NETFLIX' };
            expect(matchesAffiliation(txn, 'PAYPAL')).toBe(true);
        });

        it('returns false for non-matching', () => {
            const txn = { description: 'NETFLIX SUBSCRIPTION' };
            expect(matchesAffiliation(txn, 'AMAZON')).toBe(false);
        });

        it('handles null affiliation', () => {
            const txn = { description: 'AMAZON' };
            expect(matchesAffiliation(txn, null)).toBe(false);
        });

        it('handles missing description', () => {
            const txn = {};
            expect(matchesAffiliation(txn, 'AMAZON')).toBe(false);
        });
    });

    describe('matchesBillingDate', () => {
        it('matches exact billing day in correct month', () => {
            const date = new Date(2024, 0, 15); // Jan 15
            expect(matchesBillingDate(date, 0, 2024, 15)).toBe(true);
        });

        it('matches within tolerance range', () => {
            const date = new Date(2024, 0, 17); // Jan 17
            expect(matchesBillingDate(date, 0, 2024, 15, 5)).toBe(true); // within 5 days
        });

        it('fails if outside tolerance', () => {
            const date = new Date(2024, 0, 22); // Jan 22
            expect(matchesBillingDate(date, 0, 2024, 15, 5)).toBe(false); // 7 days away
        });

        it('fails for wrong month', () => {
            const date = new Date(2024, 1, 15); // Feb 15
            expect(matchesBillingDate(date, 0, 2024, 15)).toBe(false); // Expected Jan
        });

        it('fails for wrong year', () => {
            const date = new Date(2023, 0, 15); // Jan 15, 2023
            expect(matchesBillingDate(date, 0, 2024, 15)).toBe(false); // Expected 2024
        });

        it('returns false for null billing day', () => {
            const date = new Date(2024, 0, 15);
            expect(matchesBillingDate(date, 0, 2024, null)).toBe(false);
        });
    });

    describe('DEFAULT_AFFILIATION_PATTERNS', () => {
        it('has AMAZON patterns', () => {
            expect(DEFAULT_AFFILIATION_PATTERNS['AMAZON']).toContain('AMAZON');
            expect(DEFAULT_AFFILIATION_PATTERNS['AMAZON']).toContain('AMZN');
        });

        it('has APPLE patterns', () => {
            expect(DEFAULT_AFFILIATION_PATTERNS['APPLE']).toContain('APPLE');
            expect(DEFAULT_AFFILIATION_PATTERNS['APPLE']).toContain('ITUNES');
        });

        it('has PAYPAL patterns', () => {
            expect(DEFAULT_AFFILIATION_PATTERNS['PAYPAL']).toContain('PAYPAL');
        });
    });
});
