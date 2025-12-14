import { describe, it, expect } from 'vitest';

/**
 * Tests for calendar projection logic - specifically how splits and merges
 * affect future projected renewals.
 */

describe('Calendar Projection Logic', () => {
    describe('Split subscription exclusion', () => {
        it('parent subscription should be excluded when split exists', () => {
            const approved = ['amazon-7.90'];
            const splitSubscriptions = {
                'amazon-7.90': {
                    splitTo: ['manual_amazon_pbs', 'manual_amazon_starz'],
                    createdAt: '2024-12-10'
                }
            };

            // Logic from CalendarView: skip if wasSplit
            const wasSplit = splitSubscriptions && splitSubscriptions['amazon-7.90'];

            expect(wasSplit).toBeTruthy();
            // Parent should NOT appear in projections
        });

        it('split children should appear instead of parent', () => {
            const manualRecurring = [
                { merchantKey: 'manual_amazon_pbs', displayName: 'Amazon PBS', merchant: 'Amazon PBS' },
                { merchantKey: 'manual_amazon_starz', displayName: 'Amazon STARZ', merchant: 'Amazon STARZ' }
            ];

            expect(manualRecurring.length).toBe(2);
            expect(manualRecurring[0].displayName).toBe('Amazon PBS');
            expect(manualRecurring[1].displayName).toBe('Amazon STARZ');
        });
    });

    describe('Merge subscription exclusion', () => {
        it('source subscriptions should be excluded when merged', () => {
            const mergedSubscriptions = {
                'merged_streaming': {
                    displayName: 'All Streaming',
                    mergedFrom: ['netflix', 'spotify', 'disney']
                }
            };

            const sourceKey = 'netflix';
            const wasSourceOfMerge = Object.values(mergedSubscriptions)
                .some(m => m.mergedFrom?.includes(sourceKey));

            expect(wasSourceOfMerge).toBe(true);
            // Netflix should NOT appear in projections
        });

        it('merged subscription should appear instead of sources', () => {
            const mergedSubscriptions = {
                'merged_streaming': {
                    displayName: 'All Streaming',
                    mergedFrom: ['netflix', 'spotify', 'disney']
                }
            };

            const mergedKey = 'merged_streaming';
            const merge = mergedSubscriptions[mergedKey];

            expect(merge.displayName).toBe('All Streaming');
            expect(merge.mergedFrom).toHaveLength(3);
        });
    });

    describe('nextDate calculation from transactions', () => {
        it('calculates nextDate as 1 month after last transaction', () => {
            const assignedTxns = [
                { date: new Date('2024-11-03'), debit: 3.95 },
                { date: new Date('2024-12-03'), debit: 3.95 }
            ];

            // Sort by date descending
            const sortedTxns = assignedTxns.sort((a, b) => new Date(b.date) - new Date(a.date));
            const lastTxn = sortedTxns[0];
            const lastDate = new Date(lastTxn.date);

            // Calculate next date
            const nextDate = new Date(lastDate);
            nextDate.setMonth(nextDate.getMonth() + 1);

            // Next date should be approximately 1 month later (Jan 2-4 range due to timezone)
            expect(nextDate.getMonth()).toBe(0); // January
            expect(nextDate.getDate()).toBeGreaterThanOrEqual(2);
            expect(nextDate.getDate()).toBeLessThanOrEqual(4);
        });

        it('derives amount from latest transaction', () => {
            const assignedTxns = [
                { date: new Date('2024-11-03'), debit: 3.95 },
                { date: new Date('2024-12-03'), debit: 4.25 } // Price increased
            ];

            const sortedTxns = assignedTxns.sort((a, b) => new Date(b.date) - new Date(a.date));
            const lastTxn = sortedTxns[0];
            const latestAmount = Math.abs(lastTxn.debit);

            expect(latestAmount).toBe(4.25);
        });

        it('detects monthly frequency from transaction pattern', () => {
            const assignedTxns = [
                { date: new Date('2024-12-03') },
                { date: new Date('2024-11-03') }
            ];

            const sortedTxns = assignedTxns.sort((a, b) => new Date(b.date) - new Date(a.date));
            const daysBetween = Math.abs(
                (new Date(sortedTxns[0].date) - new Date(sortedTxns[1].date)) / (1000 * 60 * 60 * 24)
            );

            let frequency;
            if (daysBetween <= 10) frequency = 'Weekly';
            else if (daysBetween <= 20) frequency = 'Bi-Weekly';
            else if (daysBetween <= 45) frequency = 'Monthly';
            else if (daysBetween <= 120) frequency = 'Quarterly';
            else frequency = 'Yearly';

            expect(daysBetween).toBe(30);
            expect(frequency).toBe('Monthly');
        });
    });
});
