import React, { useState, useMemo } from 'react';
import { GitMerge, X, Search } from 'lucide-react';
import SplitMerchantModal from './SplitMerchantModal';
import SplitChargesModal from './SplitChargesModal';
import ImportSubscriptionsModal from './ImportSubscriptionsModal';
import { generateSubscriptionRules } from '../utils/ruleEngine';
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

// Simple Error Boundary Component
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true };
    }
    componentDidCatch(error, errorInfo) {
        console.error("RecurringItem Error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', marginBottom: '12px' }}>
                    Error loading item.
                </div>
            );
        }
        return this.props.children;
    }
}

export default function Subscriptions() {
    const {
        transactions,
        approvedItems, setApprovedItems,
        deniedItems, setDeniedItems,
        manualRecurring, setManualRecurring,
        chargeAssignments, setChargeAssignments,
        merchantSplits, setMerchantSplits,
        mergedSubscriptions, setMergedSubscriptions,
        splitSubscriptions, setSplitSubscriptions,
        categoryOverrides,
        globalRenames,
        setGlobalRenames,
        setCustomNames,
        subscriptionRules,
        setSubscriptionRules,
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
    const [mergeTarget, setMergeTarget] = useState('new'); // 'new' or an existing merchantKey
    const [importModalOpen, setImportModalOpen] = useState(false);

    // Search and filter state
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'Active', 'Expired'

    // Aliases
    const approved = approvedItems;
    const setApproved = setApprovedItems;
    const denied = deniedItems;
    const setDenied = setDeniedItems;

    // Helper to get effective display name (checks globalRenames, mergedSubscriptions, then falls back to merchant)
    const getEffectiveName = (sub) => {
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

    // --- Actions ---

    const openSplitCharges = (sub) => {
        setSubscriptionToSplit(sub);
        setSplitChargesModalOpen(true);
    };

    const handleCreateNewFromSplit = (newSub) => {
        // Update Manual Recurring State & LocalStorage
        const manual = JSON.parse(localStorage.getItem(MANUAL_RECURRING_KEY) || '[]');
        if (!manual.some(m => m.merchantKey === newSub.merchantKey)) {
            const newItem = {
                merchantKey: newSub.merchantKey,
                merchant: newSub.merchant,
                displayName: newSub.displayName,
                amount: 0,
                category: 'OTHER',
                dateAdded: new Date().toISOString(),
                isManuallyCreated: true
            };
            const updatedManual = [...manual, newItem];
            localStorage.setItem(MANUAL_RECURRING_KEY, JSON.stringify(updatedManual));
            setManualRecurring(prev => [...prev, newItem]);
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
        if (mergeSelected.length < 2) return;

        const toMerge = allApprovedItems.filter(s => mergeSelected.includes(s.merchantKey));

        // Determine target key - either existing item or new merged item
        let targetKey;
        let targetDisplayName;

        if (mergeTarget === 'new') {
            // Creating new merged subscription
            if (!mergedName.trim()) return;
            targetKey = `merged_${mergedName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
            targetDisplayName = mergedName.trim();

            const priceHistory = toMerge.map(s => ({
                amount: s.latestAmount,
                merchantKey: s.merchantKey,
                originalMerchant: s.merchant
            }));

            const merged = {
                ...mergedSubscriptions,
                [targetKey]: {
                    displayName: targetDisplayName,
                    mergedFrom: mergeSelected,
                    priceHistory: priceHistory,
                    createdAt: new Date().toISOString()
                }
            };
            setMergedSubscriptions(merged);
            localStorage.setItem(MERGED_SUBSCRIPTIONS_KEY, JSON.stringify(merged));
        } else {
            // Merging into existing recurring item
            targetKey = mergeTarget;
            const existingItem = allApprovedItems.find(s => s.merchantKey === targetKey);
            targetDisplayName = existingItem?.merchant || targetKey;

            // Build price history from items being merged INTO the target
            const additionalPriceHistory = toMerge
                .filter(s => s.merchantKey !== targetKey)
                .map(s => ({
                    amount: s.latestAmount,
                    merchantKey: s.merchantKey,
                    originalMerchant: s.merchant
                }));

            // Always create/update a mergedSubscriptions entry for tracking and undo
            const existingMerge = mergedSubscriptions[targetKey] || {
                displayName: targetDisplayName,
                mergedFrom: [],
                priceHistory: [],
                createdAt: new Date().toISOString()
            };

            const merged = {
                ...mergedSubscriptions,
                [targetKey]: {
                    ...existingMerge,
                    displayName: targetDisplayName,
                    mergedFrom: [...new Set([...(existingMerge.mergedFrom || []), ...mergeSelected.filter(k => k !== targetKey)])],
                    priceHistory: [...(existingMerge.priceHistory || []), ...additionalPriceHistory]
                }
            };
            setMergedSubscriptions(merged);
            localStorage.setItem(MERGED_SUBSCRIPTIONS_KEY, JSON.stringify(merged));
        }

        // Assign all transactions from merged items to the target key
        const newAssignments = {};
        toMerge.forEach(sub => {
            if (sub.merchantKey !== targetKey && sub.allTransactions) {
                sub.allTransactions.forEach(t => {
                    newAssignments[getTransactionId(t)] = targetKey;
                });
            }
        });

        setChargeAssignments(prev => {
            const updated = { ...prev, ...newAssignments };
            localStorage.setItem(CHARGE_ASSIGNMENTS_KEY, JSON.stringify(updated));
            return updated;
        });

        setMergeSelected([]);
        setShowMergePrompt(false);
        setMergedName('');
        setMergeTarget('new');
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

    const datasetEndDate = useMemo(() => {
        if (!transactions || transactions.length === 0) return new Date();
        const dates = transactions.map(t => new Date(t.date));
        return new Date(Math.max(...dates));
    }, [transactions]);

    // Merge manual recurring items into approved items
    const allApprovedItems = useMemo(() => {
        const assignmentsByTarget = {};
        Object.entries(chargeAssignments).forEach(([transactionId, targetKey]) => {
            if (!assignmentsByTarget[targetKey]) {
                assignmentsByTarget[targetKey] = [];
            }
            assignmentsByTarget[targetKey].push(transactionId);
        });

        const activeKeys = new Set([
            ...approvedSubscriptions.map(i => i.merchantKey),
            ...manualRecurring.map(m => m.merchantKey),
            ...Object.keys(mergedSubscriptions || {})
        ]);

        // Collect all merchant keys that were merged INTO another item (these should be hidden)
        const mergedSourceKeys = new Set();
        Object.values(mergedSubscriptions || {}).forEach(merge => {
            if (merge && merge.mergedFrom) {
                merge.mergedFrom.forEach(key => mergedSourceKeys.add(key));
            }
        });

        const processedApproved = approvedSubscriptions
            // Exclude items that were merged into another item
            .filter(item => !mergedSourceKeys.has(item.merchantKey))
            .map(item => {
                const thisSubTransactionIds = new Set(
                    (item.allTransactions || []).map(t => getTransactionId(t))
                );

                // Find transactions reassigned AWAY from this item
                const reassignedFromThisSub = new Set(
                    Object.entries(chargeAssignments)
                        .filter(([txnId, targetKey]) =>
                            thisSubTransactionIds.has(txnId) &&
                            targetKey !== item.merchantKey &&
                            activeKeys.has(targetKey)
                        )
                        .map(([txnId]) => txnId)
                );

                // Find transactions assigned TO this item from other sources
                const incomingAssignedIds = new Set(assignmentsByTarget[item.merchantKey] || []);
                const incomingTransactions = transactions.filter(t => {
                    const txnId = getTransactionId(t);
                    // Include if assigned to this item AND not already in original transactions
                    return incomingAssignedIds.has(txnId) && !thisSubTransactionIds.has(txnId);
                });

                // Combine: original transactions (minus reassigned) + incoming assigned
                const filteredTransactions = (item.allTransactions || [])
                    .filter(t => !reassignedFromThisSub.has(getTransactionId(t)));

                const combinedTransactions = [...filteredTransactions, ...incomingTransactions];

                if (combinedTransactions.length === 0 && item.allTransactions?.length > 0) return null;

                const amounts = combinedTransactions.map(t => t.amount || t.debit || t.credit || 0);
                const latestAmount = amounts.length > 0 ? amounts[amounts.length - 1] : 0;
                const totalSpent = amounts.reduce((a, b) => a + b, 0);

                // Calculate status
                let gracePeriod = 20;
                if (item.frequency === 'Yearly' || item.frequency === 'Quarterly') gracePeriod = 45;
                const expiryThreshold = new Date(item.nextDate);
                expiryThreshold.setDate(expiryThreshold.getDate() + gracePeriod);
                const status = datasetEndDate > expiryThreshold ? 'Expired' : 'Active';

                return {
                    ...item,
                    allTransactions: combinedTransactions,
                    count: combinedTransactions.length,
                    latestAmount,
                    totalSpent,
                    status,
                    // Mark as merged if this item has a mergedSubscriptions entry (was a merge target)
                    isMerged: !!mergedSubscriptions[item.merchantKey]
                };
            }).filter(Boolean);

        // Get keys already processed from detected subscriptions
        const processedApprovedKeys = new Set(processedApproved.map(item => item.merchantKey));

        // Manual items: include those NOT already in processedApproved (detected subscriptions)
        // This allows manually added items to show, even if auto-approved
        const manualItems = manualRecurring
            .filter(m => !processedApprovedKeys.has(m.merchantKey))
            .map(m => {
                const assignedTxnIds = new Set(assignmentsByTarget[m.merchantKey] || []);
                const assignedTransactions = transactions.filter(t =>
                    assignedTxnIds.has(getTransactionId(t))
                );
                const amounts = assignedTransactions.map(t => t.debit || t.credit || t.amount || 0);
                const latestAmount = amounts.length > 0 ? amounts[amounts.length - 1] : (m.amount || 0);
                const totalSpent = amounts.reduce((a, b) => a + b, 0);
                let nextDate = new Date(datasetEndDate.getTime() + 30 * 24 * 60 * 60 * 1000); // Default next month from NOW (dataset end)

                if (assignedTransactions.length > 0) {
                    const sortedByDate = [...assignedTransactions].sort((a, b) =>
                        new Date(b.date) - new Date(a.date)
                    );
                    const lastDate = new Date(sortedByDate[0].date);
                    nextDate = new Date(lastDate);
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }

                // Status logic
                let status = 'Active';
                // dataSetEndDate logic applies if we have transactions. If purely manual with no txns, assume Active.
                if (assignedTransactions.length > 0) {
                    const gracePeriod = 20;
                    const expiryThreshold = new Date(nextDate);
                    expiryThreshold.setDate(expiryThreshold.getDate() + gracePeriod);
                    status = datasetEndDate > expiryThreshold ? 'Expired' : 'Active';
                }


                return {
                    merchantKey: m.merchantKey,
                    merchant: m.displayName || m.merchant,
                    baseMerchant: m.merchant,
                    latestAmount,
                    totalSpent,
                    totalSpent,
                    avgAmount: assignedTransactions.length > 0 ? totalSpent / assignedTransactions.length : (m.amount || 0),
                    frequency: assignedTransactions.length > 0 ? 'Monthly' : 'Manual',
                    count: Math.max(assignedTransactions.length, 1),
                    isManual: true,
                    effectiveCategory: m.category,
                    nextDate,
                    status,
                    allTransactions: assignedTransactions,
                    firstDate: assignedTransactions.length > 0
                        ? [...assignedTransactions].sort((a, b) => new Date(a.date) - new Date(b.date))[0]?.date
                        : null,
                    lastDate: assignedTransactions.length > 0
                        ? [...assignedTransactions].sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date
                        : null
                };
            });

        // Only create mergedItems for newly-created merged subscriptions (keys starting with 'merged_')
        // Existing items that were merge targets are already handled in processedApproved
        const mergedItems = Object.entries(mergedSubscriptions || {})
            .filter(([key, data]) => data && typeof data === 'object' && key.startsWith('merged_'))
            .map(([key, data]) => {
                const assignedTxnIds = new Set(assignmentsByTarget[key] || []);
                const assignedTransactions = transactions.filter(t =>
                    assignedTxnIds.has(getTransactionId(t))
                );

                const amounts = assignedTransactions.map(t => t.debit || t.credit || t.amount || 0);
                const latestAmount = amounts.length > 0 ? amounts[amounts.length - 1] : 0;
                const totalSpent = amounts.reduce((a, b) => a + b, 0);

                // Calc next date based on most recent transaction + 1 month
                let nextDate = new Date(datasetEndDate.getTime() + 30 * 24 * 60 * 60 * 1000); // Default
                if (assignedTransactions.length > 0) {
                    const sortedByDate = [...assignedTransactions].sort((a, b) =>
                        new Date(b.date) - new Date(a.date)
                    );
                    const lastDate = new Date(sortedByDate[0].date);
                    nextDate = new Date(lastDate);
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }

                // Status logic
                let status = 'Active';
                if (assignedTransactions.length > 0) {
                    const gracePeriod = 20;
                    const expiryThreshold = new Date(nextDate);
                    expiryThreshold.setDate(expiryThreshold.getDate() + gracePeriod);
                    status = datasetEndDate > expiryThreshold ? 'Expired' : 'Active';
                }

                return {
                    merchantKey: key,
                    merchant: data.displayName,
                    baseMerchant: data.displayName,
                    latestAmount,
                    totalSpent,
                    avgAmount: assignedTransactions.length > 0 ? totalSpent / assignedTransactions.length : 0,
                    frequency: 'Monthly',
                    count: Math.max(assignedTransactions.length, 1),
                    isMerged: true, // Marker for specific logic if needed
                    isManual: true, // Behave like manual for some purposes
                    effectiveCategory: 'OTHER', // Default or derived?
                    nextDate,
                    status,
                    allTransactions: assignedTransactions,
                    firstDate: assignedTransactions.length > 0
                        ? [...assignedTransactions].sort((a, b) => new Date(a.date) - new Date(b.date))[0]?.date
                        : null,
                    lastDate: assignedTransactions.length > 0
                        ? [...assignedTransactions].sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date
                        : null
                };
            });

        return [...processedApproved, ...manualItems, ...mergedItems];
    }, [approvedSubscriptions, manualRecurring, transactions, chargeAssignments, approvedItems, mergedSubscriptions, datasetEndDate]);

    const itemsToMerge = useMemo(() => {
        return allApprovedItems.filter(s => mergeSelected.includes(s.merchantKey));
    }, [allApprovedItems, mergeSelected]);

    const totalToMerge = itemsToMerge.reduce((sum, s) => sum + s.latestAmount, 0);

    const approveItem = (merchantKey) => {
        setApproved(prev => {
            if (prev.includes(merchantKey)) return prev;
            return [...prev, merchantKey];
        });
        setDenied(prev => prev.filter(k => k !== merchantKey));

        // Assign transactions to this key (fixes umbrella item linking)
        const sub = subscriptions.find(s => s.merchantKey === merchantKey);
        if (sub && sub.allTransactions) {
            const newAssignments = {};
            sub.allTransactions.forEach(t => {
                const tId = getTransactionId(t);
                // Only assign if not already assigned (preserve manual splits)
                if (!chargeAssignments[tId]) {
                    newAssignments[tId] = merchantKey;
                }
            });
            if (Object.keys(newAssignments).length > 0) {
                setChargeAssignments(prev => ({ ...prev, ...newAssignments }));
            }
        }
    };

    const denyItem = (merchantKey) => {
        setDenied(prev => [...prev, merchantKey]);
        setApproved(prev => prev.filter(k => k !== merchantKey));

        // Remove assignments for this key
        setChargeAssignments(prev => {
            const updated = { ...prev };
            let hasChanges = false;
            Object.keys(updated).forEach(tId => {
                if (updated[tId] === merchantKey) {
                    delete updated[tId];
                    hasChanges = true;
                }
            });
            return hasChanges ? updated : prev;
        });
    };

    const deleteRecurringItem = (merchantKey) => {
        // 1. Check Merged Subscriptions
        if (mergedSubscriptions && mergedSubscriptions[merchantKey]) {
            const newMerged = { ...mergedSubscriptions };
            delete newMerged[merchantKey];
            setMergedSubscriptions(newMerged);
            localStorage.setItem(MERGED_SUBSCRIPTIONS_KEY, JSON.stringify(newMerged));

            // Clean up assignments
            setChargeAssignments(prev => {
                const updated = { ...prev };
                let hasChanges = false;
                Object.keys(updated).forEach(tId => {
                    if (updated[tId] === merchantKey) {
                        delete updated[tId];
                        hasChanges = true;
                    }
                });
                localStorage.setItem(CHARGE_ASSIGNMENTS_KEY, JSON.stringify(updated));
                return updated;
            });
            return;
        }

        // 2. Check Manual Recurring
        if (manualRecurring.some(m => m.merchantKey === merchantKey)) {
            const newManual = manualRecurring.filter(m => m.merchantKey !== merchantKey);
            setManualRecurring(newManual);
            localStorage.setItem(MANUAL_RECURRING_KEY, JSON.stringify(newManual));

            // Clean up assignments
            setChargeAssignments(prev => {
                const updated = { ...prev };
                let hasChanges = false;
                Object.keys(updated).forEach(tId => {
                    if (updated[tId] === merchantKey) {
                        delete updated[tId];
                        hasChanges = true;
                    }
                });
                localStorage.setItem(CHARGE_ASSIGNMENTS_KEY, JSON.stringify(updated));
                return updated;
            });
            return;
        }

        // 3. Approved Lists (Detected) - Verify if it's there
        if (approved.includes(merchantKey)) {
            denyItem(merchantKey);
        }
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

    // Get unique categories for filter dropdown
    const availableCategories = useMemo(() => {
        const cats = new Set();
        allApprovedItems.forEach(item => {
            const effectiveCategory = categoryOverrides[item.merchantKey] || item.category || 'OTHER';
            cats.add(effectiveCategory);
        });
        return [...cats].sort();
    }, [allApprovedItems, categoryOverrides]);

    // Apply search and filters to approved items
    const filteredApprovedItems = useMemo(() => {
        let filtered = allApprovedItems;

        // Apply search
        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(item => {
                // Check merchant name
                if (item.merchant?.toLowerCase().includes(searchLower)) return true;
                if (item.baseMerchant?.toLowerCase().includes(searchLower)) return true;

                // Check effective name (from renames, merges)
                const effectiveName = getEffectiveName(item);
                if (effectiveName?.toLowerCase().includes(searchLower)) return true;

                return false;
            });
        }

        // Apply category filter
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(item => {
                const effectiveCategory = categoryOverrides[item.merchantKey] || item.category || 'OTHER';
                return effectiveCategory === categoryFilter;
            });
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(item => item.status === statusFilter);
        }

        return filtered;
    }, [allApprovedItems, search, categoryFilter, statusFilter, categoryOverrides, getEffectiveName]);

    const groupedByCategory = (() => {
        const groups = {};
        filteredApprovedItems.forEach(item => {
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
                    onImportClick={() => setImportModalOpen(true)}
                />
            </div>

            {/* Search and Filter Bar */}
            <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                {/* Search Input */}
                <div style={{
                    position: 'relative',
                    flex: '1 1 200px',
                    maxWidth: '300px'
                }}>
                    <Search
                        size={16}
                        style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-secondary)'
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Search recurring..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 12px 10px 36px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem'
                        }}
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '4px'
                            }}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Category Filter */}
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{
                        padding: '10px 12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                    }}
                >
                    <option value="all">All Categories</option>
                    {availableCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>

                {/* Status Filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                        padding: '10px 12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                    }}
                >
                    <option value="all">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Expired">Expired</option>
                </select>

                {/* Results Count */}
                {(search || categoryFilter !== 'all' || statusFilter !== 'all') && (
                    <span style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        marginLeft: 'auto'
                    }}>
                        {filteredApprovedItems.length} of {allApprovedItems.length} items
                    </span>
                )}
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
                    onDelete={deleteRecurringItem}
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
                    allSubscriptions={allApprovedItems}
                    isOpen={splitChargesModalOpen}
                    onClose={() => setSplitChargesModalOpen(false)}
                    globalRenames={globalRenames}
                    mergedSubscriptions={mergedSubscriptions}
                    onCreateNewSubscription={handleCreateNewFromSplit}
                    onSave={(newAssignments, createdSubs) => {
                        // Update charge assignments
                        setChargeAssignments(prev => ({ ...prev, ...newAssignments }));

                        // Track the split in splitSubscriptions for Rules display
                        if (Object.keys(newAssignments).length > 0 || (createdSubs && createdSubs.length > 0)) {
                            const splitKey = subscriptionToSplit.merchantKey;
                            const splitToTargets = {};

                            // Group assignments by target
                            Object.entries(newAssignments).forEach(([txnId, targetKey]) => {
                                if (!splitToTargets[targetKey]) {
                                    splitToTargets[targetKey] = [];
                                }
                                splitToTargets[targetKey].push(txnId);
                            });

                            setSplitSubscriptions(prev => ({
                                ...prev,
                                [splitKey]: {
                                    displayName: subscriptionToSplit.displayName || subscriptionToSplit.merchant,
                                    splitTo: Object.keys(splitToTargets),
                                    createdSubscriptions: (createdSubs || []).map(s => s.merchantKey),
                                    transactionCount: Object.keys(newAssignments).length,
                                    createdAt: new Date().toISOString()
                                }
                            }));
                        }
                    }}
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

                        {/* Merge Target Selection */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '8px', fontWeight: '500' }}>Merge into:</label>
                            <select
                                value={mergeTarget}
                                onChange={(e) => {
                                    setMergeTarget(e.target.value);
                                    if (e.target.value !== 'new') {
                                        // If selecting existing item, pre-fill name with that item's display name
                                        const existing = allApprovedItems.find(s => s.merchantKey === e.target.value);
                                        if (existing) setMergedName(getEffectiveName(existing));
                                    } else {
                                        setMergedName('');
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="new">+ Create new subscription</option>
                                <optgroup label="Existing subscriptions">
                                    {allApprovedItems
                                        .filter(s => !mergeSelected.includes(s.merchantKey))
                                        .map(s => (
                                            <option key={s.merchantKey} value={s.merchantKey}>
                                                {getEffectiveName(s)} (${s.latestAmount.toFixed(2)}/mo)
                                            </option>
                                        ))
                                    }
                                </optgroup>
                                {mergeSelected.length > 0 && (
                                    <optgroup label="Selected items (merge into)">
                                        {allApprovedItems
                                            .filter(s => mergeSelected.includes(s.merchantKey))
                                            .map(s => (
                                                <option key={s.merchantKey} value={s.merchantKey}>
                                                    {getEffectiveName(s)} (${s.latestAmount.toFixed(2)}/mo)
                                                </option>
                                            ))
                                        }
                                    </optgroup>
                                )}
                            </select>
                        </div>

                        {/* New Name Input - only show when creating new */}
                        {mergeTarget === 'new' && (
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
                        )}

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setShowMergePrompt(false);
                                    setMergeTarget('new');
                                    setMergedName('');
                                }}
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
                                disabled={mergeTarget === 'new' && !mergedName.trim()}
                                style={{
                                    padding: '8px 16px',
                                    background: (mergeTarget !== 'new' || mergedName.trim()) ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: (mergeTarget !== 'new' || mergedName.trim()) ? 'white' : 'var(--text-secondary)',
                                    cursor: (mergeTarget !== 'new' || mergedName.trim()) ? 'pointer' : 'not-allowed',
                                    fontWeight: 500
                                }}
                            >
                                Merge
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Floating Merge Action Bar */}
            {
                mergeSelected.length > 0 && (
                    <div style={{
                        position: 'fixed',
                        bottom: '24px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '12px 20px',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(139, 92, 246, 0.95) 100%)',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        zIndex: 1000,
                        animation: 'slideUp 0.3s ease-out'
                    }}>
                        <style>{`
                        @keyframes slideUp {
                            from { transform: translateX(-50%) translateY(100px); opacity: 0; }
                            to { transform: translateX(-50%) translateY(0); opacity: 1; }
                        }
                    `}</style>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'white',
                            fontSize: '0.9rem',
                            fontWeight: 500
                        }}>
                            <GitMerge size={18} />
                            <span>{mergeSelected.length} items selected</span>
                        </div>
                        <button
                            onClick={() => setShowMergePrompt(true)}
                            style={{
                                padding: '8px 20px',
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                        >
                            <GitMerge size={14} />
                            Merge
                        </button>
                        <button
                            onClick={() => setMergeSelected([])}
                            style={{
                                padding: '6px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                borderRadius: '6px',
                                color: 'rgba(255, 255, 255, 0.7)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                            title="Clear selection"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )
            }

            {/* Import Subscriptions Modal */}
            {importModalOpen && (
                <ImportSubscriptionsModal
                    isOpen={importModalOpen}
                    onClose={() => setImportModalOpen(false)}
                    transactions={transactions}
                    onImport={(importData) => {
                        const { manualRecurringEntries, chargeAssignmentUpdates, globalRenameUpdates, parsedSubscriptions } = importData;

                        // Add manual recurring entries
                        if (manualRecurringEntries.length > 0) {
                            setManualRecurring(prev => {
                                const existing = new Set(prev.map(m => m.merchantKey));
                                const newItems = manualRecurringEntries.filter(m => !existing.has(m.merchantKey));
                                return [...prev, ...newItems];
                            });
                        }

                        // Update charge assignments
                        if (Object.keys(chargeAssignmentUpdates).length > 0) {
                            setChargeAssignments(prev => ({ ...prev, ...chargeAssignmentUpdates }));
                        }

                        // Update global renames
                        if (Object.keys(globalRenameUpdates).length > 0) {
                            setGlobalRenames(prev => ({ ...prev, ...globalRenameUpdates }));
                        }

                        // Generate and save subscription rules for future imports
                        if (parsedSubscriptions && manualRecurringEntries.length > 0) {
                            const newRules = generateSubscriptionRules(importData, parsedSubscriptions);
                            if (Object.keys(newRules).length > 0) {
                                setSubscriptionRules(prev => ({ ...prev, ...newRules }));
                            }
                        }
                    }}
                />
            )}
        </div >
    );
}
