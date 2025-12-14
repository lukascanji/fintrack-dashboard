import { describe, it, expect } from 'vitest';
import {
    parseBillingDay,
    parsePrice,
    parseSubscriptionCSV,
    groupByAffiliation
} from '../../utils/csvSubscriptionParser';

describe('csvSubscriptionParser', () => {
    describe('parseBillingDay', () => {
        it('parses 1st as 1', () => {
            expect(parseBillingDay('1st')).toBe(1);
        });

        it('parses 2nd as 2', () => {
            expect(parseBillingDay('2nd')).toBe(2);
        });

        it('parses 3rd as 3', () => {
            expect(parseBillingDay('3rd')).toBe(3);
        });

        it('parses 4th as 4', () => {
            expect(parseBillingDay('4th')).toBe(4);
        });

        it('parses End as 31', () => {
            expect(parseBillingDay('End')).toBe(31);
        });

        it('parses end (lowercase) as 31', () => {
            expect(parseBillingDay('end')).toBe(31);
        });

        it('returns null for invalid input', () => {
            expect(parseBillingDay('')).toBe(null);
            expect(parseBillingDay(null)).toBe(null);
            expect(parseBillingDay('invalid')).toBe(null);
        });
    });

    describe('parsePrice', () => {
        it('parses $10.99 correctly', () => {
            expect(parsePrice('$10.99')).toBe(10.99);
        });

        it('parses price without dollar sign', () => {
            expect(parsePrice('10.99')).toBe(10.99);
        });

        it('parses price with comma separator', () => {
            expect(parsePrice('$1,234.56')).toBe(1234.56);
        });

        it('returns null for dash (inactive)', () => {
            expect(parsePrice('-')).toBe(null);
        });

        it('returns null for empty string', () => {
            expect(parsePrice('')).toBe(null);
        });
    });

    describe('parseSubscriptionCSV', () => {
        const sampleCSV = `Service,Affiliation,Day,Jan,Feb,Mar
Apple Music,APPLE,1st,$10.99,$10.99,$10.99
iCloud,APPLE,15th,$2.99,-,$2.99
PBS,AMAZON,4th,$7.90,$7.90,$7.90`;

        it('parses services correctly', () => {
            const result = parseSubscriptionCSV(sampleCSV, 2024);
            expect(result.subscriptions).toHaveLength(3);
            expect(result.errors).toHaveLength(0);
        });

        it('extracts service names', () => {
            const result = parseSubscriptionCSV(sampleCSV, 2024);
            const names = result.subscriptions.map(s => s.serviceName);
            expect(names).toContain('Apple Music');
            expect(names).toContain('iCloud');
            expect(names).toContain('PBS');
        });

        it('extracts affiliations', () => {
            const result = parseSubscriptionCSV(sampleCSV, 2024);
            const apple = result.subscriptions.find(s => s.serviceName === 'Apple Music');
            expect(apple.affiliation).toBe('APPLE');
        });

        it('parses billing days', () => {
            const result = parseSubscriptionCSV(sampleCSV, 2024);
            const apple = result.subscriptions.find(s => s.serviceName === 'Apple Music');
            expect(apple.billingDay).toBe(1);
        });

        it('builds price history from month columns', () => {
            const result = parseSubscriptionCSV(sampleCSV, 2024);
            const apple = result.subscriptions.find(s => s.serviceName === 'Apple Music');
            expect(apple.priceHistory).toHaveLength(3); // Jan, Feb, Mar
            expect(apple.priceHistory[0].amount).toBe(10.99);
            expect(apple.priceHistory[0].month).toBe(0); // January
        });

        it('skips inactive months (dash)', () => {
            const result = parseSubscriptionCSV(sampleCSV, 2024);
            const icloud = result.subscriptions.find(s => s.serviceName === 'iCloud');
            expect(icloud.priceHistory).toHaveLength(2); // Jan and Mar only
        });

        it('skips TOTAL row', () => {
            const csvWithTotal = `Service,Affiliation,Day,Jan
TOTAL,,-,$100.00
Apple Music,APPLE,1st,$10.99`;
            const result = parseSubscriptionCSV(csvWithTotal, 2024);
            expect(result.subscriptions).toHaveLength(1);
            expect(result.subscriptions[0].serviceName).toBe('Apple Music');
        });

        it('calculates unique amounts', () => {
            const csvWithPriceChange = `Service,Affiliation,Day,Jan,Feb
Netflix,APPLE,15th,$9.99,$10.99`;
            const result = parseSubscriptionCSV(csvWithPriceChange, 2024);
            const netflix = result.subscriptions[0];
            expect(netflix.uniqueAmounts).toContain(9.99);
            expect(netflix.uniqueAmounts).toContain(10.99);
        });
    });

    describe('groupByAffiliation', () => {
        it('groups subscriptions by affiliation', () => {
            const subs = [
                { serviceName: 'A', affiliation: 'APPLE' },
                { serviceName: 'B', affiliation: 'AMAZON' },
                { serviceName: 'C', affiliation: 'APPLE' }
            ];
            const grouped = groupByAffiliation(subs);
            expect(grouped['APPLE']).toHaveLength(2);
            expect(grouped['AMAZON']).toHaveLength(1);
        });

        it('groups null affiliation as UNKNOWN', () => {
            const subs = [{ serviceName: 'A', affiliation: null }];
            const grouped = groupByAffiliation(subs);
            expect(grouped['UNKNOWN']).toHaveLength(1);
        });
    });
});
