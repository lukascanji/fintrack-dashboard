import { describe, it, expect } from 'vitest';

/**
 * Tests for getEffectiveName helper function logic.
 * This helper resolves display names with the correct priority order.
 */

describe('getEffectiveName Logic', () => {
    // Simulate the getEffectiveName function logic
    const getEffectiveName = (sub, globalRenames, mergedSubscriptions) => {
        // Check globalRenames (with amount key first, then base key)
        const amountKey = `${sub.merchantKey}-${sub.latestAmount?.toFixed(2)}`;
        if (globalRenames[amountKey]?.displayName) return globalRenames[amountKey].displayName;
        if (globalRenames[sub.merchantKey]?.displayName) return globalRenames[sub.merchantKey].displayName;

        // Check mergedSubscriptions
        if (mergedSubscriptions[sub.merchantKey]?.displayName) return mergedSubscriptions[sub.merchantKey].displayName;

        // Check if item itself has displayName (manual recurring / splits)
        if (sub.displayName) return sub.displayName;

        return sub.merchant;
    };

    describe('Priority order', () => {
        it('1. globalRenames with amount key takes highest priority', () => {
            const sub = { merchantKey: 'paypal', latestAmount: 25.98, merchant: 'PAYPAL ($25.98)' };
            const globalRenames = {
                'paypal-25.98': { displayName: 'Xbox Gamepass Ultimate' }
            };
            const mergedSubscriptions = {};

            expect(getEffectiveName(sub, globalRenames, mergedSubscriptions)).toBe('Xbox Gamepass Ultimate');
        });

        it('2. globalRenames with base key is second priority', () => {
            const sub = { merchantKey: 'netflix', latestAmount: 15.99, merchant: 'NETFLIX' };
            const globalRenames = {
                'netflix': { displayName: 'Netflix Premium' }
            };
            const mergedSubscriptions = {};

            expect(getEffectiveName(sub, globalRenames, mergedSubscriptions)).toBe('Netflix Premium');
        });

        it('3. mergedSubscriptions displayName is third priority', () => {
            const sub = { merchantKey: 'merged_streaming', latestAmount: 47.97, merchant: 'Streaming Bundle' };
            const globalRenames = {};
            const mergedSubscriptions = {
                'merged_streaming': { displayName: 'All Streaming Services' }
            };

            expect(getEffectiveName(sub, globalRenames, mergedSubscriptions)).toBe('All Streaming Services');
        });

        it('4. sub.displayName is fourth priority', () => {
            const sub = {
                merchantKey: 'manual_vpn_123',
                displayName: 'VPN Service',
                merchant: 'Manual Subscription'
            };
            const globalRenames = {};
            const mergedSubscriptions = {};

            expect(getEffectiveName(sub, globalRenames, mergedSubscriptions)).toBe('VPN Service');
        });

        it('5. sub.merchant is fallback', () => {
            const sub = { merchantKey: 'unknown', merchant: 'UNKNOWN MERCHANT' };
            const globalRenames = {};
            const mergedSubscriptions = {};

            expect(getEffectiveName(sub, globalRenames, mergedSubscriptions)).toBe('UNKNOWN MERCHANT');
        });
    });

    describe('Edge cases', () => {
        it('prefers amount key over base key when both exist', () => {
            const sub = { merchantKey: 'paypal', latestAmount: 25.98, merchant: 'PAYPAL' };
            const globalRenames = {
                'paypal': { displayName: 'PayPal General' },
                'paypal-25.98': { displayName: 'Xbox Gamepass' }
            };
            const mergedSubscriptions = {};

            expect(getEffectiveName(sub, globalRenames, mergedSubscriptions)).toBe('Xbox Gamepass');
        });

        it('handles undefined latestAmount gracefully', () => {
            const sub = { merchantKey: 'netflix', merchant: 'NETFLIX' };
            const globalRenames = {
                'netflix': { displayName: 'Netflix HD' }
            };
            const mergedSubscriptions = {};

            expect(getEffectiveName(sub, globalRenames, mergedSubscriptions)).toBe('Netflix HD');
        });

        it('handles empty globalRenames and mergedSubscriptions', () => {
            const sub = { merchantKey: 'amazon', merchant: 'AMAZON' };
            const globalRenames = {};
            const mergedSubscriptions = {};

            expect(getEffectiveName(sub, globalRenames, mergedSubscriptions)).toBe('AMAZON');
        });
    });
});
