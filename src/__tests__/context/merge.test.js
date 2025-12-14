import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Tests for merge state transformations.
 * These test the expected behavior when merging subscriptions.
 */

// Mock localStorage for tests
let mockStorage = {};

beforeEach(() => {
    mockStorage = {};
    global.localStorage = {
        getItem: (key) => mockStorage[key] || null,
        setItem: (key, value) => { mockStorage[key] = value; },
        removeItem: (key) => { delete mockStorage[key]; },
        clear: () => { mockStorage = {}; }
    };
});

describe('Merge State Logic', () => {
    describe('mergedSubscriptions structure', () => {
        it('creates a merged subscription entry with correct shape', () => {
            const mergedSubscriptions = {};
            const targetKey = 'merged_streaming_services';
            const sourceKeys = ['netflix', 'spotify', 'disney'];

            // Simulate merge operation
            mergedSubscriptions[targetKey] = {
                displayName: 'Streaming Services',
                mergedFrom: sourceKeys,
                createdAt: new Date().toISOString()
            };

            expect(mergedSubscriptions[targetKey]).toBeDefined();
            expect(mergedSubscriptions[targetKey].displayName).toBe('Streaming Services');
            expect(mergedSubscriptions[targetKey].mergedFrom).toHaveLength(3);
            expect(mergedSubscriptions[targetKey].mergedFrom).toContain('netflix');
        });

        it('merge into existing item has different structure', () => {
            const mergedSubscriptions = {};
            const targetKey = 'netflix'; // Existing item key (no merged_ prefix)
            const sourceKeys = ['spotify', 'disney'];

            // Merge INTO netflix (existing item)
            mergedSubscriptions[targetKey] = {
                displayName: 'Streaming Bundle',
                mergedFrom: sourceKeys, // Only source keys, not including target
                createdAt: new Date().toISOString()
            };

            // Target key doesn't start with merged_ 
            expect(targetKey.startsWith('merged_')).toBe(false);
            // mergedFrom only contains sources, not the target itself
            expect(mergedSubscriptions[targetKey].mergedFrom).toHaveLength(2);
            expect(mergedSubscriptions[targetKey].mergedFrom).not.toContain('netflix');
        });
    });

    describe('chargeAssignments after merge', () => {
        it('assigns source transactions to merged target', () => {
            const chargeAssignments = {};
            const targetKey = 'merged_streaming_services';
            const sourceTransactionIds = ['txn_1', 'txn_2', 'txn_3', 'txn_4'];

            // All source transactions point to merged target
            sourceTransactionIds.forEach(id => {
                chargeAssignments[id] = targetKey;
            });

            expect(Object.keys(chargeAssignments)).toHaveLength(4);
            expect(chargeAssignments['txn_1']).toBe(targetKey);
            expect(chargeAssignments['txn_4']).toBe(targetKey);
        });
    });

    describe('approvedItems after merge', () => {
        it('source items should be filtered from display list', () => {
            const approvedItems = ['netflix', 'spotify', 'disney', 'amazon'];
            const mergedSubscriptions = {
                'merged_streaming': {
                    displayName: 'Streaming',
                    mergedFrom: ['netflix', 'spotify', 'disney']
                }
            };

            // Compute which items were merged away
            const mergedSourceKeys = new Set(
                Object.values(mergedSubscriptions).flatMap(m => m.mergedFrom || [])
            );

            // Filter approved items to exclude merged sources
            const displayedApproved = approvedItems.filter(
                key => !mergedSourceKeys.has(key)
            );

            expect(displayedApproved).toHaveLength(1);
            expect(displayedApproved).toContain('amazon');
            expect(displayedApproved).not.toContain('netflix');
        });
    });

    describe('bundle count calculation', () => {
        it('new merged item: count equals mergedFrom length', () => {
            const merge = {
                displayName: 'Streaming',
                mergedFrom: ['netflix', 'spotify', 'disney']
            };
            const key = 'merged_streaming';

            // For merged_ prefixed keys, count = mergedFrom.length
            const bundleCount = key.startsWith('merged_')
                ? merge.mergedFrom.length
                : merge.mergedFrom.length + 1;

            expect(bundleCount).toBe(3);
        });

        it('existing item as target: count equals mergedFrom + 1', () => {
            const merge = {
                displayName: 'Netflix Bundle',
                mergedFrom: ['spotify', 'disney']
            };
            const key = 'netflix'; // Existing item key

            // For non-merged_ keys, count = mergedFrom.length + 1 (includes target)
            const bundleCount = key.startsWith('merged_')
                ? merge.mergedFrom.length
                : merge.mergedFrom.length + 1;

            expect(bundleCount).toBe(3);
        });
    });

    describe('unmerge operation', () => {
        it('removes merged subscription entry', () => {
            const mergedSubscriptions = {
                'merged_streaming': {
                    displayName: 'Streaming',
                    mergedFrom: ['netflix', 'spotify']
                }
            };

            const keyToUnmerge = 'merged_streaming';
            delete mergedSubscriptions[keyToUnmerge];

            expect(mergedSubscriptions[keyToUnmerge]).toBeUndefined();
        });

        it('clears charge assignments for unmerged item', () => {
            const chargeAssignments = {
                'txn_1': 'merged_streaming',
                'txn_2': 'merged_streaming',
                'txn_3': 'amazon'
            };

            const keyToUnmerge = 'merged_streaming';

            // Remove assignments pointing to unmerged key
            Object.keys(chargeAssignments).forEach(txnId => {
                if (chargeAssignments[txnId] === keyToUnmerge) {
                    delete chargeAssignments[txnId];
                }
            });

            expect(Object.keys(chargeAssignments)).toHaveLength(1);
            expect(chargeAssignments['txn_3']).toBe('amazon');
        });
    });
});
