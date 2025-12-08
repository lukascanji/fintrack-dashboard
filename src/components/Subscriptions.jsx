import { useState, useMemo } from 'react';
import { GitMerge } from 'lucide-react';
import SplitMerchantModal from './SplitMerchantModal';
import SplitChargesModal from './SplitChargesModal';
import { getTransactionId } from '../utils/transactionId';
import { detectSubscriptions } from '../features/recurring/utils/recurringUtils';
import { useTransactions } from '../context/TransactionContext';
import RecurringStats from '../features/recurring/components/RecurringStats';
import RecurringList from '../features/recurring/components/RecurringList';
import PendingReviewList from '../features/recurring/components/PendingReviewList';

const APPROVED_KEY = 'fintrack_recurring_approved';
const DENIED_KEY = 'fintrack_recurring_denied';
const MANUAL_RECURRING_KEY = 'fintrack_manual_recurring';
const MERGED_SUBSCRIPTIONS_KEY = 'fintrack_merged_subscriptions';
const CHARGE_ASSIGNMENTS_KEY = 'fintrack_charge_assignments';
const SPLITS_KEY = 'fintrack_merchant_splits';

export default function Subscriptions() {
    const {
        transactions,
        approvedItems, setApprovedItems,
        deniedItems, setDeniedItems,
        manualRecurring, setManualRecurring,
        chargeAssignments, setChargeAssignments,
        merchantSplits, setMerchantSplits,
        mergedSubscriptions, setMergedSubscriptions,
        categoryOverrides,
        setGlobalRenames,
        setCustomNames,
    } = useTransactions();

    const subscriptions = useMemo(() => detectSubscriptions(transactions), [transactions]);
    const [expandedApprovedKey, setExpandedApprovedKey] = useState(null);
    const [splitModalOpen, setSplitModalOpen] = useState(false);
    const [merchantToSplit, setMerchantToSplit] = useState(null);
    const [splitChargesModalOpen, setSplitChargesModalOpen] = useState(false);
    const [subscriptionToSplit, setSubscriptionToSplit] = useState(null);
    const [mergeSelected, setMergeSelected] = useState([]);
    const [showMergePrompt, setShowMergePrompt] = useState(false);
    const [mergedName, setMergedName] = useState('');

    // Aliases
    const approved = approvedItems;
    const setApproved = setApprovedItems;
    const denied = deniedItems;
    const setDenied = setDeniedItems;

    // --- Actions ---

    const openSplitCharges = (sub) => {
        setSubscriptionToSplit(sub);
        setSplitChargesModalOpen(true);
    };

    const handleCreateNewFromSplit = (newSub) => {
        setApproved(prev => {
            if (!prev.includes(newSub.merchantKey)) {
                const updated = [...prev, newSub.merchantKey];
                localStorage.setItem(APPROVED_KEY, JSON.stringify(updated));
                return updated;
            }
            return prev;
        });
        const manual = JSON.parse(localStorage.getItem(MANUAL_RECURRING_KEY) || '[]');
        if (!manual.some(m => m.merchantKey === newSub.merchantKey)) {
            manual.push({
                merchantKey: newSub.merchantKey,
                merchant: newSub.merchant,
                displayName: newSub.displayName,
                amount: 0,
                category: 'OTHER',
                dateAdded: new Date().toISOString(),
                isManuallyCreated: true
            });
            localStorage.setItem(MANUAL_RECURRING_KEY, JSON.stringify(manual));
        }
    };

    const toggleMergeSelect = (merchantKey) => {
        setMergeSelected(prev => {
            if (prev.includes(merchantKey)) {
                return prev.filter(k => k !== merchantKey);
            }
            return [...prev, merchantKey];
        });
    };

    const executeMerge = () => {
        if (mergeSelected.length < 2 || !mergedName.trim()) return;
        const newKey = `merged_${mergedName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
        const toMerge = allApprovedItems.filter(s => mergeSelected.includes(s.merchantKey));
        const priceHistory = toMerge.map(s => ({
            amount: s.latestAmount,
            merchantKey: s.merchantKey,
            originalMerchant: s.merchant
        }));
        const merged = {
            ...mergedSubscriptions,
            [newKey]: {
                displayName: mergedName.trim(),
                mergedFrom: mergeSelected,
                priceHistory: priceHistory,
                createdAt: new Date().toISOString()
            }
        };
        setMergedSubscriptions(merged);
        localStorage.setItem(MERGED_SUBSCRIPTIONS_KEY, JSON.stringify(merged));
        setMergeSelected([]);
        setShowMergePrompt(false);
        setMergedName('');
    };

    const openSplitModal = (sub) => {
        setMerchantToSplit({
            merchantKey: sub.merchantKey,
            merchantName: sub.baseMerchant || sub.merchant,
            transactions: sub.allTransactions || []
        });
        setSplitModalOpen(true);
    };

    const saveMerchantSplit = (merchantKey, splitData) => {
        setMerchantSplits(prev => ({ ...prev, [merchantKey]: splitData }));
    };

    const clearAllSplits = () => {
        setMerchantSplits({});
        localStorage.removeItem(SPLITS_KEY);
    };

    // --- Derived State ---

    const pendingItems = useMemo(() => {
        return subscriptions.filter(
            s => !approved.includes(s.merchantKey) && !denied.includes(s.merchantKey)
        );
    }, [subscriptions, approved, denied]);

    const approvedSubscriptions = useMemo(() => {
        return subscriptions.filter(s => approved.includes(s.merchantKey));
    }, [subscriptions, approved]);

    // Merge manual recurring items into approved items
    const allApprovedItems = useMemo(() => {
        const assignmentsByTarget = {};
        Object.entries(chargeAssignments).forEach(([transactionId, targetKey]) => {
            if (!assignmentsByTarget[targetKey]) {
                assignmentsByTarget[targetKey] = [];
            }
            assignmentsByTarget[targetKey].push(transactionId);
        });

        const processedApproved = approvedSubscriptions.map(item => {
            const activeKeys = new Set([
                ...approvedSubscriptions.map(i => i.merchantKey),
                ...manualRecurring.map(m => m.merchantKey)
            ]);
            const thisSubTransactionIds = new Set(
                (item.allTransactions || []).map(t => getTransactionId(t))
            );
            const reassignedFromThisSub = new Set(
                Object.entries(chargeAssignments)
                    .filter(([txnId, targetKey]) =>
                        thisSubTransactionIds.has(txnId) &&
                        targetKey !== item.merchantKey &&
                        activeKeys.has(targetKey)
                    )
                    .map(([txnId]) => txnId)
            );

            if (reassignedFromThisSub.size === 0) return item;

            const filteredTransactions = (item.allTransactions || [])
                .filter(t => !reassignedFromThisSub.has(getTransactionId(t)));

            if (filteredTransactions.length === 0 && item.allTransactions?.length > 0) return null;

            const amounts = filteredTransactions.map(t => t.amount || t.debit || t.credit || 0);
            const latestAmount = amounts.length > 0 ? amounts[amounts.length - 1] : 0;
            const totalSpent = amounts.reduce((a, b) => a + b, 0);

            return {
                ...item,
                allTransactions: filteredTransactions,
                count: filteredTransactions.length,
                latestAmount,
                totalSpent
            };
        }).filter(Boolean);

        const manualItems = manualRecurring
            .filter(m => !approved.includes(m.merchantKey))
            .map(m => {
                const assignedTxnIds = new Set(assignmentsByTarget[m.merchantKey] || []);
                const assignedTransactions = transactions.filter(t =>
                    assignedTxnIds.has(getTransactionId(t))
                );
                const amounts = assignedTransactions.map(t => t.debit || t.credit || t.amount || 0);
                const latestAmount = amounts.length > 0 ? amounts[amounts.length - 1] : (m.amount || 0);
                const totalSpent = amounts.reduce((a, b) => a + b, 0);
                let nextDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                if (assignedTransactions.length > 0) {
                    const sortedByDate = [...assignedTransactions].sort((a, b) =>
                        new Date(b.date) - new Date(a.date)
                    );
                    const lastDate = new Date(sortedByDate[0].date);
                    nextDate = new Date(lastDate);
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }
                return {
                    merchantKey: m.merchantKey,
                    merchant: m.displayName || m.merchant,
                    baseMerchant: m.merchant,
                    latestAmount,
                    totalSpent,
                    frequency: assignedTransactions.length > 0 ? 'Monthly' : 'Manual',
                    count: Math.max(assignedTransactions.length, 1),
                    isManual: true,
                    effectiveCategory: m.category,
                    nextDate,
                    allTransactions: assignedTransactions,
                    firstDate: assignedTransactions.length > 0
                        ? [...assignedTransactions].sort((a, b) => new Date(a.date) - new Date(b.date))[0]?.date
                        : null,
                    lastDate: assignedTransactions.length > 0
                        ? [...assignedTransactions].sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date
                        : null
                };
            });

        return [...processedApproved, ...manualItems];
    }, [approvedSubscriptions, manualRecurring, transactions, chargeAssignments, approvedItems]);

    const itemsToMerge = useMemo(() => {
        return allApprovedItems.filter(s => mergeSelected.includes(s.merchantKey));
    }, [allApprovedItems, mergeSelected]);

    const totalToMerge = itemsToMerge.reduce((sum, s) => sum + s.latestAmount, 0);

    const approveItem = (merchantKey) => {
        setApproved(prev => [...prev, merchantKey]);
        setDenied(prev => prev.filter(k => k !== merchantKey));
    };

    const denyItem = (merchantKey) => {
        setDenied(prev => [...prev, merchantKey]);
        setApproved(prev => prev.filter(k => k !== merchantKey));
    };

    if (!subscriptions || subscriptions.length === 0) {
        return (
            <div className="card">
                <div className="card-title">Recurring Charges</div>
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No recurring charges detected yet.
                    <div style={{ fontSize: '0.75rem', marginTop: '8px' }}>
                        (Requires 4+ similar payments to detect patterns)
                    </div>
                </div>
            </div>
        );
    }

    const monthlyTotal = allApprovedItems
        .filter(s => s.frequency === 'Monthly' || s.frequency === 'Manual')
        .reduce((sum, s) => sum + s.latestAmount, 0);

    const groupedByCategory = (() => {
        const groups = {};
        allApprovedItems.forEach(item => {
            const effectiveCategory = categoryOverrides[item.merchantKey] || item.category || 'OTHER';
            if (!groups[effectiveCategory]) groups[effectiveCategory] = [];
            groups[effectiveCategory].push({ ...item, effectiveCategory });
        });
        return groups;
    })();

    return (
        <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
            {/* Header Stats & Controls */}
            <div className="card">
                <RecurringStats
                    monthlyTotal={monthlyTotal}
                    hasSplits={Object.keys(merchantSplits).length > 0}
                    onClearSplits={clearAllSplits}
                    mergeSelectedCount={mergeSelected.length}
                    onShowMergePrompt={() => setShowMergePrompt(true)}
                    onClearMergeSelection={() => setMergeSelected([])}
                    hasApprovedItems={allApprovedItems.length > 0}
                />
            </div>

            <div style={{ display: 'flex', gap: '24px' }}>
                {/* Main List */}
                <RecurringList
                    groupedSubscriptions={groupedByCategory}
                    expandedKey={expandedApprovedKey}
                    onExpand={(key) => setExpandedApprovedKey(prev => prev === key ? null : key)}
                    onSplit={openSplitCharges}
                    mergeSelected={mergeSelected}
                    onToggleMerge={toggleMergeSelect}
                />

                {/* Sidebar */}
                <PendingReviewList
                    pendingItems={pendingItems}
                    onApprove={approveItem}
                    onDeny={denyItem}
                />
            </div>

            {/* Modals */}
            {splitModalOpen && merchantToSplit && (
                <SplitMerchantModal
                    merchant={merchantToSplit}
                    onClose={() => setSplitModalOpen(false)}
                    onSave={(splitData) => {
                        saveMerchantSplit(merchantToSplit.merchantKey, splitData);
                        setSplitModalOpen(false);
                    }}
                />
            )}

            {splitChargesModalOpen && subscriptionToSplit && (
                <SplitChargesModal
                    subscription={subscriptionToSplit}
                    isOpen={splitChargesModalOpen}
                    onClose={() => setSplitChargesModalOpen(false)}
                    onCreateNew={handleCreateNewFromSplit}
                />
            )}

            {/* Merge Prompt Modal */}
            {showMergePrompt && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ width: '400px' }}>
                        <div className="card-title">Merge Subscriptions</div>
                        <div style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Combine {mergeSelected.length} items into a single recurring subscription.
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: '500', marginBottom: '8px' }}>Items to merge:</div>
                            {itemsToMerge.map(item => (
                                <div key={item.merchantKey} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span>{item.merchant}</span>
                                    <span>${item.latestAmount.toFixed(2)}</span>
                                </div>
                            ))}
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                                <span>Total</span>
                                <span>${totalToMerge.toFixed(2)}</span>
                            </div>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>New Name</label>
                            <input
                                type="text"
                                value={mergedName}
                                onChange={(e) => setMergedName(e.target.value)}
                                placeholder="e.g. Streaming Bundle"
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                    color: 'var(--text-primary)'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowMergePrompt(false)}
                                style={{
                                    padding: '8px 16px',
                                    background: 'transparent',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeMerge}
                                disabled={!mergedName.trim()}
                                style={{
                                    padding: '8px 16px',
                                    background: mergedName.trim() ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: mergedName.trim() ? 'white' : 'var(--text-secondary)',
                                    cursor: mergedName.trim() ? 'pointer' : 'not-allowed',
                                    fontWeight: 500
                                }}
                            >
                                Merge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
