import { useMemo } from 'react';
import { RefreshCw, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { getMerchantKey } from '../utils/categorize';

// Fuzzy amount matching: returns true if amounts are within 3% of each other
// (handles minor tax variations without grouping truly different subscriptions)
function amountsMatch(a, b) {
    if (a === 0 || b === 0) return a === b;
    return Math.abs(a - b) / Math.max(a, b) < 0.03;
}

// Minimum occurrences to qualify as recurring
const MIN_OCCURRENCES = 4;
const MIN_YEARLY_OCCURRENCES = 2; // Lower threshold for yearly (only 2 data points over 1-2 years)

// Detect recurring transactions (subscriptions) with fuzzy matching
export function detectSubscriptions(transactions) {
    if (!transactions || transactions.length === 0) return [];

    // Group by fuzzy merchant key (first 8 chars normalized)
    const groups = {};

    transactions
        .filter(t => t.debit > 0) // Only debits (money out)
        .forEach(t => {
            const merchantKey = getMerchantKey(t.description);

            // Find existing group that matches this merchant
            let matchedKey = null;
            for (const key of Object.keys(groups)) {
                if (key === merchantKey) {
                    matchedKey = key;
                    break;
                }
            }

            if (!matchedKey) {
                groups[merchantKey] = {
                    merchant: t.merchant,
                    category: t.category,
                    transactions: []
                };
                matchedKey = merchantKey;
            }

            groups[matchedKey].transactions.push({
                date: t.date,
                amount: t.debit,
                description: t.description
            });
        });

    // Analyze each group for recurring patterns
    const subscriptions = [];

    Object.entries(groups).forEach(([merchantKey, group]) => {
        // Skip if less than minimum yearly threshold (we'll check per-frequency later)
        if (group.transactions.length < MIN_YEARLY_OCCURRENCES) return;

        // Sort by date
        group.transactions.sort((a, b) => a.date - b.date);

        // Find clusters of similar amounts (fuzzy matching)
        const amountClusters = [];
        group.transactions.forEach(txn => {
            let foundCluster = false;
            for (const cluster of amountClusters) {
                if (amountsMatch(cluster.baseAmount, txn.amount)) {
                    cluster.transactions.push(txn);
                    foundCluster = true;
                    break;
                }
            }
            if (!foundCluster) {
                amountClusters.push({
                    baseAmount: txn.amount,
                    transactions: [txn]
                });
            }
        });

        // Process EACH cluster that meets min occurrences (umbrella merchant split)
        // e.g., Apple.com might have Apple Music ($10.99) and iCloud ($2.99)
        amountClusters.forEach(cluster => {
            // Skip clusters with less than 2 transactions (minimum for any pattern)
            if (cluster.transactions.length < MIN_YEARLY_OCCURRENCES) return;

            const txns = cluster.transactions;
            const clusterAmount = cluster.baseAmount;

            // Calculate intervals first to determine frequency
            const intervals = [];
            for (let i = 1; i < txns.length; i++) {
                const daysDiff = (txns[i].date - txns[i - 1].date) / (1000 * 60 * 60 * 24);
                intervals.push(daysDiff);
            }

            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

            // Determine frequency with tolerance
            let frequency = null;
            if (avgInterval >= 5 && avgInterval <= 10) frequency = 'Weekly';
            else if (avgInterval >= 12 && avgInterval <= 18) frequency = 'Bi-Weekly';
            else if (avgInterval >= 25 && avgInterval <= 38) frequency = 'Monthly';
            else if (avgInterval >= 80 && avgInterval <= 100) frequency = 'Quarterly';
            else if (avgInterval >= 350 && avgInterval <= 380) frequency = 'Yearly';

            if (!frequency) return;

            // Apply frequency-specific minimum occurrences
            // Yearly only needs 2, others need 4
            const minRequired = frequency === 'Yearly' ? MIN_YEARLY_OCCURRENCES : MIN_OCCURRENCES;
            if (txns.length < minRequired) return;

            // Create unique key: merchantKey-amount (for umbrella merchants)
            const uniqueKey = amountClusters.length > 1
                ? `${merchantKey}-${clusterAmount.toFixed(2)}`
                : merchantKey;

            // Calculate amounts
            const amounts = txns.map(t => t.amount);
            const latestAmount = amounts[amounts.length - 1];
            const previousAmount = amounts.length > 1 ? amounts[amounts.length - 2] : latestAmount;
            const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const totalSpent = amounts.reduce((a, b) => a + b, 0);

            // Detect price change
            const priceChange = latestAmount - previousAmount;
            const priceChangePercent = previousAmount > 0 ? (priceChange / previousAmount) * 100 : 0;

            // Calculate next renewal
            const lastDate = txns[txns.length - 1].date;
            const nextDate = new Date(lastDate);
            if (frequency === 'Weekly') nextDate.setDate(nextDate.getDate() + 7);
            else if (frequency === 'Bi-Weekly') nextDate.setDate(nextDate.getDate() + 14);
            else if (frequency === 'Monthly') nextDate.setMonth(nextDate.getMonth() + 1);
            else if (frequency === 'Quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
            else if (frequency === 'Yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

            // Display name includes amount hint if umbrella
            const displayMerchant = amountClusters.length > 1
                ? `${group.merchant} ($${clusterAmount.toFixed(2)})`
                : group.merchant;

            subscriptions.push({
                merchantKey: uniqueKey,
                merchant: displayMerchant,
                baseMerchant: group.merchant, // Original merchant name
                category: group.category,
                frequency,
                count: txns.length,
                latestAmount,
                avgAmount,
                priceChange,
                priceChangePercent,
                firstDate: txns[0].date,
                lastDate,
                nextDate,
                totalSpent,
                isUmbrellaItem: amountClusters.length > 1,
                allTransactions: txns
            });
        });
    });

    // Sort by total spent descending
    return subscriptions.sort((a, b) => b.totalSpent - a.totalSpent);
}

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Mail, Plus, Check, X, Users, Scissors, Pencil } from 'lucide-react';
import SplitMerchantModal from './SplitMerchantModal';

const EMAIL_STORAGE_KEY = 'fintrack_subscription_emails';
const SHARED_STORAGE_KEY = 'fintrack_shared_subscriptions';
const NAMES_STORAGE_KEY = 'fintrack_person_names';
const APPROVED_KEY = 'fintrack_recurring_approved';
const DENIED_KEY = 'fintrack_recurring_denied';
const CUSTOM_NAMES_KEY = 'fintrack_recurring_names';
const CATEGORY_OVERRIDES_KEY = 'fintrack_recurring_categories';
const SPLITS_KEY = 'fintrack_merchant_splits';
const GLOBAL_RENAMES_KEY = 'fintrack_global_renames'; // App-wide merchant renames

const ALL_CATEGORIES = [
    'ENTERTAINMENT', 'DINING', 'GROCERIES', 'SHOPPING', 'TRANSPORTATION',
    'UTILITIES', 'GAMBLING', 'FEES', 'OTHER'
];

export default function Subscriptions({ transactions }) {
    const subscriptions = useMemo(() => detectSubscriptions(transactions), [transactions]);
    const [expandedIndex, setExpandedIndex] = useState(null);
    const [expandedApprovedKey, setExpandedApprovedKey] = useState(null); // merchantKey for expanded approved item
    const [emailSelectorOpen, setEmailSelectorOpen] = useState(null); // merchant key for open selector
    const [shareSelectorOpen, setShareSelectorOpen] = useState(null); // merchant key for open share selector
    const [splitModalOpen, setSplitModalOpen] = useState(false);
    const [merchantToSplit, setMerchantToSplit] = useState(null);
    const [newEmailInput, setNewEmailInput] = useState('');

    // Load saved emails from localStorage (merchant -> email mapping)
    const [emails, setEmails] = useState(() => {
        try {
            const saved = localStorage.getItem(EMAIL_STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    // Save emails to localStorage when changed
    useEffect(() => {
        localStorage.setItem(EMAIL_STORAGE_KEY, JSON.stringify(emails));
    }, [emails]);

    // Global renames state (app-wide merchant name mappings)
    const [globalRenames, setGlobalRenames] = useState(() => {
        try {
            const saved = localStorage.getItem(GLOBAL_RENAMES_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    useEffect(() => {
        localStorage.setItem(GLOBAL_RENAMES_KEY, JSON.stringify(globalRenames));
    }, [globalRenames]);

    // Inline rename editing state
    const [renamingKey, setRenamingKey] = useState(null); // merchantKey being renamed
    const [renameInput, setRenameInput] = useState('');

    // Handler to start renaming
    const startRename = (sub) => {
        setRenamingKey(sub.merchantKey);
        setRenameInput(globalRenames[sub.merchantKey]?.displayName || sub.merchant);
    };

    // Handler to save rename
    const saveRename = (merchantKey, originalMerchant, amount) => {
        if (renameInput.trim()) {
            setGlobalRenames(prev => ({
                ...prev,
                [merchantKey]: {
                    displayName: renameInput.trim(),
                    originalMerchant: originalMerchant,
                    amount: amount
                }
            }));
        }
        setRenamingKey(null);
        setRenameInput('');
    };

    // Handler to cancel rename
    const cancelRename = () => {
        setRenamingKey(null);
        setRenameInput('');
    };

    // Approval workflow state
    const [approved, setApproved] = useState(() => {
        try {
            const saved = localStorage.getItem(APPROVED_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [denied, setDenied] = useState(() => {
        try {
            const saved = localStorage.getItem(DENIED_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [customNames, setCustomNames] = useState(() => {
        try {
            const saved = localStorage.getItem(CUSTOM_NAMES_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const [categoryOverrides, setCategoryOverrides] = useState(() => {
        try {
            const saved = localStorage.getItem(CATEGORY_OVERRIDES_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    // Save approval state to localStorage
    useEffect(() => {
        localStorage.setItem(APPROVED_KEY, JSON.stringify(approved));
    }, [approved]);

    useEffect(() => {
        localStorage.setItem(DENIED_KEY, JSON.stringify(denied));
    }, [denied]);

    useEffect(() => {
        localStorage.setItem(CUSTOM_NAMES_KEY, JSON.stringify(customNames));
    }, [customNames]);

    useEffect(() => {
        localStorage.setItem(CATEGORY_OVERRIDES_KEY, JSON.stringify(categoryOverrides));
    }, [categoryOverrides]);

    // Merchant splits state
    const [merchantSplits, setMerchantSplits] = useState(() => {
        try {
            const saved = localStorage.getItem(SPLITS_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    useEffect(() => {
        localStorage.setItem(SPLITS_KEY, JSON.stringify(merchantSplits));
    }, [merchantSplits]);

    // Handler for opening split modal
    const openSplitModal = (sub) => {
        setMerchantToSplit({
            merchantKey: sub.merchantKey,
            merchantName: sub.baseMerchant || sub.merchant,
            transactions: sub.allTransactions || []
        });
        setSplitModalOpen(true);
    };

    // Handler for saving splits
    const saveMerchantSplit = (merchantKey, splitData) => {
        setMerchantSplits(prev => ({
            ...prev,
            [merchantKey]: splitData
        }));
    };


    // Compute pending, approved, and denied items
    const pendingItems = useMemo(() => {
        return subscriptions.filter(
            s => !approved.includes(s.merchantKey) && !denied.includes(s.merchantKey)
        );
    }, [subscriptions, approved, denied]);

    // Apply splits to approved items - transform subscription names based on saved splits
    const approvedItems = useMemo(() => {
        const approvedSubs = subscriptions.filter(s => approved.includes(s.merchantKey));

        return approvedSubs.map(sub => {
            // Check if this subscription has saved splits
            const splits = merchantSplits[sub.merchantKey];
            if (!splits || !splits.clusters) return sub;

            // Find cluster name for this subscription's amount
            const amountKey = sub.latestAmount.toFixed(2);
            const clusterInfo = splits.clusters[amountKey];

            if (clusterInfo && clusterInfo.name) {
                return {
                    ...sub,
                    displayName: clusterInfo.name,
                    splitCategory: clusterInfo.category,
                    isSplit: true
                };
            }

            return sub;
        });
    }, [subscriptions, approved, merchantSplits]);

    const deniedItems = useMemo(() => {
        return subscriptions.filter(s => denied.includes(s.merchantKey));
    }, [subscriptions, denied]);

    // Approval actions
    const approveItem = (merchantKey) => {
        setApproved(prev => [...prev, merchantKey]);
        setDenied(prev => prev.filter(k => k !== merchantKey));
    };

    const denyItem = (merchantKey) => {
        setDenied(prev => [...prev, merchantKey]);
        setApproved(prev => prev.filter(k => k !== merchantKey));
    };

    const undenyItem = (merchantKey) => {
        setDenied(prev => prev.filter(k => k !== merchantKey));
    };

    const setCustomName = (merchantKey, name) => {
        setCustomNames(prev => ({ ...prev, [merchantKey]: name }));
    };

    const setCategoryOverride = (merchantKey, category) => {
        setCategoryOverrides(prev => ({ ...prev, [merchantKey]: category }));
    };

    // State for inline category selector
    const [categorySelectorOpen, setCategorySelectorOpen] = useState(null);

    // Get unique emails from all saved associations
    const uniqueEmails = useMemo(() => {
        const allEmails = Object.values(emails).filter(e => e && e.trim());
        return [...new Set(allEmails)].sort();
    }, [emails]);

    const assignEmail = (merchant, email) => {
        setEmails(prev => ({ ...prev, [merchant]: email }));
        setEmailSelectorOpen(null);
        setNewEmailInput('');
    };

    const addNewEmail = (merchant) => {
        if (newEmailInput.trim()) {
            assignEmail(merchant, newEmailInput.trim());
        }
    };

    const removeEmail = (merchant, e) => {
        e.stopPropagation();
        setEmails(prev => {
            const updated = { ...prev };
            delete updated[merchant];
            return updated;
        });
    };

    const toggleEmailSelector = (merchant, e) => {
        e.stopPropagation();
        setEmailSelectorOpen(emailSelectorOpen === merchant ? null : merchant);
        setNewEmailInput('');
    };

    // Shared subscriptions state
    const [sharedSubs, setSharedSubs] = useState(() => {
        try {
            const saved = localStorage.getItem(SHARED_STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    // Save shared subscriptions to localStorage
    useEffect(() => {
        localStorage.setItem(SHARED_STORAGE_KEY, JSON.stringify(sharedSubs));
    }, [sharedSubs]);

    // Unified people list (shared across all tabs)
    const [peopleList, setPeopleList] = useState(() => {
        try {
            const saved = localStorage.getItem('fintrack_people_list');
            return saved ? JSON.parse(saved) : ['You'];
        } catch {
            return ['You'];
        }
    });

    // Save people list to localStorage
    useEffect(() => {
        localStorage.setItem('fintrack_people_list', JSON.stringify(peopleList));
    }, [peopleList]);

    // Add new person to the unified list
    const addPersonToList = (name) => {
        const trimmed = name.trim();
        if (trimmed && !peopleList.includes(trimmed)) {
            setPeopleList(prev => [...prev, trimmed]);
        }
    };

    const toggleSharedWith = (merchant, person) => {
        setSharedSubs(prev => {
            const current = prev[merchant] || [];
            if (current.includes(person)) {
                return { ...prev, [merchant]: current.filter(p => p !== person) };
            } else {
                return { ...prev, [merchant]: [...current, person] };
            }
        });
    };

    const getShareCount = (merchant) => {
        const shared = sharedSubs[merchant] || [];
        return shared.length > 0 ? shared.length : 1; // At least 1 (you)
    };

    const getYourShare = (amount, merchant) => {
        const count = getShareCount(merchant);
        return amount / count;
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

    // Only count approved items in totals
    const monthlyTotal = approvedItems
        .filter(s => s.frequency === 'Monthly')
        .reduce((sum, s) => sum + s.latestAmount, 0);

    // Group approved items by category (using overrides if set)
    const groupedByCategory = useMemo(() => {
        const groups = {};
        approvedItems.forEach(item => {
            // Use override if exists, otherwise use item's category
            const effectiveCategory = categoryOverrides[item.merchantKey] || item.category || 'OTHER';
            if (!groups[effectiveCategory]) groups[effectiveCategory] = [];
            // Add effectiveCategory to item for display
            groups[effectiveCategory].push({ ...item, effectiveCategory });
        });
        return groups;
    }, [approvedItems, categoryOverrides]);

    const toggleExpand = (index) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    // State for denied section collapse
    const [deniedCollapsed, setDeniedCollapsed] = useState(true);

    return (
        <div style={{ display: 'flex', gap: '24px' }}>
            {/* Left: Approved items grouped by category */}
            <div style={{ flex: 1 }}>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div className="card-title" style={{ margin: 0 }}>Recurring Charges</div>
                        {approvedItems.length > 0 && (
                            <div style={{
                                padding: '6px 12px',
                                background: 'var(--gradient-primary)',
                                borderRadius: '20px',
                                fontSize: '0.875rem',
                                fontWeight: '600'
                            }}>
                                ~${monthlyTotal.toFixed(0)}/mo
                            </div>
                        )}
                    </div>

                    {approvedItems.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No approved recurring charges yet.
                            <div style={{ fontSize: '0.75rem', marginTop: '8px' }}>
                                Approve items from the pending list →
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {Object.entries(groupedByCategory).map(([category, items]) => (
                                <div key={category}>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        color: 'var(--text-secondary)',
                                        marginBottom: '8px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {category}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {items.map((sub, i) => (
                                            <div key={sub.merchantKey}>
                                                {/* Clickable header row */}
                                                <div
                                                    onClick={() => setExpandedApprovedKey(
                                                        expandedApprovedKey === sub.merchantKey ? null : sub.merchantKey
                                                    )}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '12px',
                                                        background: expandedApprovedKey === sub.merchantKey
                                                            ? 'rgba(99, 102, 241, 0.1)'
                                                            : 'rgba(255, 255, 255, 0.03)',
                                                        borderRadius: expandedApprovedKey === sub.merchantKey
                                                            ? '8px 8px 0 0'
                                                            : '8px',
                                                        border: '1px solid var(--border-color)',
                                                        borderBottom: expandedApprovedKey === sub.merchantKey
                                                            ? 'none'
                                                            : '1px solid var(--border-color)',
                                                        cursor: 'pointer',
                                                        position: 'relative',
                                                        transition: 'background 0.15s'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{
                                                            padding: '8px',
                                                            background: 'rgba(99, 102, 241, 0.2)',
                                                            borderRadius: '8px'
                                                        }}>
                                                            <RefreshCw size={16} color="var(--accent-primary)" />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {renamingKey === sub.merchantKey ? (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={e => e.stopPropagation()}>
                                                                        <input
                                                                            type="text"
                                                                            value={renameInput}
                                                                            onChange={(e) => setRenameInput(e.target.value)}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') saveRename(sub.merchantKey, sub.baseMerchant || sub.merchant, sub.latestAmount);
                                                                                if (e.key === 'Escape') cancelRename();
                                                                            }}
                                                                            autoFocus
                                                                            style={{
                                                                                padding: '4px 8px',
                                                                                background: 'rgba(0,0,0,0.3)',
                                                                                border: '1px solid var(--accent-primary)',
                                                                                borderRadius: '4px',
                                                                                color: 'var(--text-primary)',
                                                                                fontSize: '0.9rem',
                                                                                width: '180px'
                                                                            }}
                                                                        />
                                                                        <button
                                                                            onClick={() => saveRename(sub.merchantKey, sub.baseMerchant || sub.merchant, sub.latestAmount)}
                                                                            style={{ background: 'var(--accent-success)', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}
                                                                        >
                                                                            <Check size={12} color="white" />
                                                                        </button>
                                                                        <button
                                                                            onClick={cancelRename}
                                                                            style={{ background: 'var(--accent-danger)', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}
                                                                        >
                                                                            <X size={12} color="white" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        {globalRenames[sub.merchantKey]?.displayName || sub.displayName || customNames[sub.merchantKey] || sub.merchant}
                                                                        {/* Rename button */}
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                startRename(sub);
                                                                            }}
                                                                            title="Rename subscription"
                                                                            style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                padding: '2px 4px',
                                                                                background: globalRenames[sub.merchantKey]
                                                                                    ? 'rgba(99, 102, 241, 0.2)'
                                                                                    : 'rgba(255, 255, 255, 0.1)',
                                                                                border: 'none',
                                                                                borderRadius: '4px',
                                                                                color: globalRenames[sub.merchantKey]
                                                                                    ? 'var(--accent-primary)'
                                                                                    : 'var(--text-secondary)',
                                                                                cursor: 'pointer',
                                                                                fontSize: '0.6rem'
                                                                            }}
                                                                        >
                                                                            <Pencil size={10} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {sub.isSplit && (
                                                                    <span style={{
                                                                        fontSize: '0.55rem',
                                                                        padding: '1px 4px',
                                                                        background: 'rgba(251, 191, 36, 0.2)',
                                                                        color: 'var(--accent-warning)',
                                                                        borderRadius: '4px'
                                                                    }}>SPLIT</span>
                                                                )}
                                                                {/* Category badge */}
                                                                <span
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setCategorySelectorOpen(
                                                                            categorySelectorOpen === sub.merchantKey ? null : sub.merchantKey
                                                                        );
                                                                    }}
                                                                    style={{
                                                                        fontSize: '0.6rem',
                                                                        padding: '2px 6px',
                                                                        background: 'rgba(99, 102, 241, 0.2)',
                                                                        borderRadius: '10px',
                                                                        color: 'var(--accent-primary)',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '3px'
                                                                    }}
                                                                >
                                                                    {sub.splitCategory || sub.effectiveCategory}
                                                                    <ChevronDown size={10} />
                                                                </span>
                                                                {/* Share button */}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setShareSelectorOpen(
                                                                            shareSelectorOpen === sub.merchantKey ? null : sub.merchantKey
                                                                        );
                                                                    }}
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        padding: '2px 6px',
                                                                        background: (sharedSubs[sub.merchantKey]?.length > 0)
                                                                            ? 'rgba(16, 185, 129, 0.2)'
                                                                            : 'rgba(255, 255, 255, 0.1)',
                                                                        border: 'none',
                                                                        borderRadius: '10px',
                                                                        color: (sharedSubs[sub.merchantKey]?.length > 0)
                                                                            ? 'var(--accent-success)'
                                                                            : 'var(--text-secondary)',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.6rem'
                                                                    }}
                                                                >
                                                                    <Users size={10} />
                                                                    {sharedSubs[sub.merchantKey]?.length > 0
                                                                        ? `${sharedSubs[sub.merchantKey].length + 1}`
                                                                        : '+'}
                                                                </button>
                                                                {/* Split button */}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openSplitModal(sub);
                                                                    }}
                                                                    title="Split bundled transaction"
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        padding: '2px 6px',
                                                                        background: merchantSplits[sub.merchantKey]
                                                                            ? 'rgba(251, 191, 36, 0.2)'
                                                                            : 'rgba(255, 255, 255, 0.1)',
                                                                        border: 'none',
                                                                        borderRadius: '10px',
                                                                        color: merchantSplits[sub.merchantKey]
                                                                            ? 'var(--accent-warning)'
                                                                            : 'var(--text-secondary)',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.6rem'
                                                                    }}
                                                                >
                                                                    <Scissors size={10} />
                                                                </button>
                                                                {/* Email button */}
                                                                <button
                                                                    onClick={(e) => toggleEmailSelector(sub.merchantKey, e)}
                                                                    title="Associate email/account"
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        padding: '2px 6px',
                                                                        background: emails[sub.merchantKey]
                                                                            ? 'rgba(59, 130, 246, 0.2)'
                                                                            : 'rgba(255, 255, 255, 0.1)',
                                                                        border: 'none',
                                                                        borderRadius: '10px',
                                                                        color: emails[sub.merchantKey]
                                                                            ? 'rgb(59, 130, 246)'
                                                                            : 'var(--text-secondary)',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.6rem'
                                                                    }}
                                                                >
                                                                    <Mail size={10} />
                                                                    {emails[sub.merchantKey] && (
                                                                        <span style={{ maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                            {emails[sub.merchantKey]}
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                                {sub.frequency} • {sub.count} charges
                                                                {sharedSubs[sub.merchantKey]?.length > 0 && (
                                                                    <span style={{ marginLeft: '8px', color: 'var(--accent-success)' }}>
                                                                        • Your share: ${(sub.latestAmount / (sharedSubs[sub.merchantKey].length + 1)).toFixed(2)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontWeight: '600' }}>${sub.latestAmount.toFixed(2)}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                                Next: {sub.nextDate.toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                        {expandedApprovedKey === sub.merchantKey
                                                            ? <ChevronUp size={16} color="var(--text-secondary)" />
                                                            : <ChevronDown size={16} color="var(--text-secondary)" />}
                                                    </div>

                                                    {/* Category selector dropdown */}
                                                    {categorySelectorOpen === sub.merchantKey && (
                                                        <div
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{
                                                                position: 'absolute',
                                                                left: '50px',
                                                                top: '100%',
                                                                zIndex: 100,
                                                                background: 'var(--bg-card)',
                                                                border: '1px solid var(--border-color)',
                                                                borderRadius: '8px',
                                                                padding: '8px',
                                                                minWidth: '150px',
                                                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                                                            }}
                                                        >
                                                            <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                                                Change Category
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                {ALL_CATEGORIES.map(cat => (
                                                                    <div
                                                                        key={cat}
                                                                        onClick={() => {
                                                                            setCategoryOverride(sub.merchantKey, cat);
                                                                            setCategorySelectorOpen(null);
                                                                        }}
                                                                        style={{
                                                                            padding: '6px 10px',
                                                                            background: sub.effectiveCategory === cat
                                                                                ? 'rgba(99, 102, 241, 0.2)'
                                                                                : 'rgba(255, 255, 255, 0.05)',
                                                                            borderRadius: '4px',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.75rem',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '6px'
                                                                        }}
                                                                    >
                                                                        {sub.effectiveCategory === cat && <Check size={12} color="var(--accent-primary)" />}
                                                                        {cat}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Share selector dropdown */}
                                                    {shareSelectorOpen === sub.merchantKey && (
                                                        <div
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{
                                                                position: 'absolute',
                                                                left: '150px',
                                                                top: '100%',
                                                                zIndex: 100,
                                                                background: 'var(--bg-card)',
                                                                border: '1px solid var(--border-color)',
                                                                borderRadius: '8px',
                                                                padding: '8px',
                                                                minWidth: '180px',
                                                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                                                            }}
                                                        >
                                                            <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                                                Split with
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                                                                {peopleList.map((person, j) => (
                                                                    <div
                                                                        key={j}
                                                                        onClick={() => toggleSharedWith(sub.merchantKey, person)}
                                                                        style={{
                                                                            padding: '6px 10px',
                                                                            background: (sharedSubs[sub.merchantKey] || []).includes(person)
                                                                                ? 'rgba(16, 185, 129, 0.2)'
                                                                                : 'rgba(255, 255, 255, 0.05)',
                                                                            borderRadius: '4px',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.75rem',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '8px'
                                                                        }}
                                                                    >
                                                                        <div style={{
                                                                            width: '14px',
                                                                            height: '14px',
                                                                            borderRadius: '3px',
                                                                            border: `2px solid ${(sharedSubs[sub.merchantKey] || []).includes(person) ? 'var(--accent-success)' : 'var(--text-secondary)'}`,
                                                                            background: (sharedSubs[sub.merchantKey] || []).includes(person) ? 'var(--accent-success)' : 'transparent',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center'
                                                                        }}>
                                                                            {(sharedSubs[sub.merchantKey] || []).includes(person) && <Check size={8} color="white" />}
                                                                        </div>
                                                                        {person}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {sharedSubs[sub.merchantKey]?.length > 0 && (
                                                                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)', fontSize: '0.7rem', color: 'var(--accent-success)' }}>
                                                                    Your share: ${(sub.latestAmount / (sharedSubs[sub.merchantKey].length + 1)).toFixed(2)}/mo
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Email selector dropdown */}
                                                    {emailSelectorOpen === sub.merchantKey && (
                                                        <div
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{
                                                                position: 'absolute',
                                                                left: '220px',
                                                                top: '100%',
                                                                zIndex: 100,
                                                                background: 'var(--bg-card)',
                                                                border: '1px solid var(--border-color)',
                                                                borderRadius: '8px',
                                                                padding: '8px',
                                                                minWidth: '220px',
                                                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                                                            }}
                                                        >
                                                            <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                                                Associate Email/Account
                                                            </div>
                                                            <input
                                                                type="email"
                                                                placeholder="email@example.com"
                                                                value={newEmailInput}
                                                                onChange={(e) => setNewEmailInput(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && newEmailInput.trim()) {
                                                                        setEmails(prev => ({
                                                                            ...prev,
                                                                            [sub.merchantKey]: newEmailInput.trim()
                                                                        }));
                                                                        setNewEmailInput('');
                                                                        setEmailSelectorOpen(null);
                                                                    }
                                                                }}
                                                                autoFocus
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '6px 10px',
                                                                    background: 'rgba(0, 0, 0, 0.3)',
                                                                    border: '1px solid var(--border-color)',
                                                                    borderRadius: '4px',
                                                                    color: 'var(--text-primary)',
                                                                    fontSize: '0.8rem',
                                                                    marginBottom: '8px',
                                                                    boxSizing: 'border-box'
                                                                }}
                                                            />
                                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                                <button
                                                                    onClick={() => {
                                                                        if (newEmailInput.trim()) {
                                                                            setEmails(prev => ({
                                                                                ...prev,
                                                                                [sub.merchantKey]: newEmailInput.trim()
                                                                            }));
                                                                            setNewEmailInput('');
                                                                            setEmailSelectorOpen(null);
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        flex: 1,
                                                                        padding: '4px 8px',
                                                                        background: 'var(--accent-success)',
                                                                        border: 'none',
                                                                        borderRadius: '4px',
                                                                        color: 'white',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.7rem'
                                                                    }}
                                                                >
                                                                    Save
                                                                </button>
                                                                {emails[sub.merchantKey] && (
                                                                    <button
                                                                        onClick={() => {
                                                                            removeEmail(sub.merchantKey);
                                                                            setEmailSelectorOpen(null);
                                                                        }}
                                                                        style={{
                                                                            padding: '4px 8px',
                                                                            background: 'var(--accent-danger)',
                                                                            border: 'none',
                                                                            borderRadius: '4px',
                                                                            color: 'white',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.7rem'
                                                                        }}
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {emails[sub.merchantKey] && (
                                                                <div style={{ marginTop: '8px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                                    Current: {emails[sub.merchantKey]}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Expanded view with timeline */}
                                                {expandedApprovedKey === sub.merchantKey && sub.allTransactions && (
                                                    <div style={{
                                                        background: 'rgba(0, 0, 0, 0.2)',
                                                        border: '1px solid var(--border-color)',
                                                        borderTop: 'none',
                                                        borderRadius: '0 0 8px 8px',
                                                        padding: '16px'
                                                    }}>
                                                        {/* Timeline visualization */}
                                                        <div style={{ marginBottom: '16px' }}>
                                                            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                                                Payment Timeline
                                                            </div>
                                                            <div style={{
                                                                overflowX: 'auto',
                                                                paddingBottom: '8px',
                                                                position: 'relative'
                                                            }}>
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'flex-end',
                                                                    gap: '16px',
                                                                    minWidth: 'max-content',
                                                                    paddingTop: '24px'
                                                                }}>
                                                                    {sub.allTransactions.map((txn, idx) => {
                                                                        const prevTxn = idx > 0 ? sub.allTransactions[idx - 1] : null;
                                                                        const priceIncrease = prevTxn && (txn.amount - prevTxn.amount) > 0.5;
                                                                        const priceDecrease = prevTxn && (prevTxn.amount - txn.amount) > 0.5;

                                                                        return (
                                                                            <div key={idx} style={{
                                                                                display: 'flex',
                                                                                flexDirection: 'column',
                                                                                alignItems: 'center',
                                                                                position: 'relative'
                                                                            }}>
                                                                                {/* Price change indicator */}
                                                                                {priceIncrease && (
                                                                                    <div style={{
                                                                                        position: 'absolute',
                                                                                        top: '-20px',
                                                                                        color: 'var(--accent-danger)',
                                                                                        fontSize: '0.65rem',
                                                                                        display: 'flex',
                                                                                        flexDirection: 'column',
                                                                                        alignItems: 'center'
                                                                                    }}>
                                                                                        <TrendingUp size={12} />
                                                                                        <span>+${(txn.amount - prevTxn.amount).toFixed(2)}</span>
                                                                                    </div>
                                                                                )}
                                                                                {priceDecrease && (
                                                                                    <div style={{
                                                                                        position: 'absolute',
                                                                                        top: '-20px',
                                                                                        color: 'var(--accent-success)',
                                                                                        fontSize: '0.65rem',
                                                                                        display: 'flex',
                                                                                        flexDirection: 'column',
                                                                                        alignItems: 'center'
                                                                                    }}>
                                                                                        <TrendingDown size={12} />
                                                                                        <span>-${(prevTxn.amount - txn.amount).toFixed(2)}</span>
                                                                                    </div>
                                                                                )}
                                                                                {/* Timeline node */}
                                                                                <div style={{
                                                                                    width: '12px',
                                                                                    height: '12px',
                                                                                    borderRadius: '50%',
                                                                                    background: priceIncrease
                                                                                        ? 'var(--accent-danger)'
                                                                                        : priceDecrease
                                                                                            ? 'var(--accent-success)'
                                                                                            : 'var(--accent-primary)',
                                                                                    border: '2px solid var(--bg-card)'
                                                                                }} />
                                                                                {/* Connecting line */}
                                                                                {idx < sub.allTransactions.length - 1 && (
                                                                                    <div style={{
                                                                                        position: 'absolute',
                                                                                        top: '50%',
                                                                                        left: '14px',
                                                                                        width: '16px',
                                                                                        height: '2px',
                                                                                        background: 'var(--border-color)',
                                                                                        transform: 'translateY(-50%)'
                                                                                    }} />
                                                                                )}
                                                                                {/* Date label */}
                                                                                <div style={{
                                                                                    marginTop: '4px',
                                                                                    fontSize: '0.6rem',
                                                                                    color: 'var(--text-secondary)',
                                                                                    whiteSpace: 'nowrap'
                                                                                }}>
                                                                                    {txn.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                                </div>
                                                                                {/* Amount */}
                                                                                <div style={{
                                                                                    fontSize: '0.65rem',
                                                                                    color: 'var(--text-primary)',
                                                                                    fontWeight: '500'
                                                                                }}>
                                                                                    ${txn.amount.toFixed(2)}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Transaction table */}
                                                        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                                            Payment History
                                                        </div>
                                                        <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                                                            <thead>
                                                                <tr style={{ color: 'var(--text-secondary)' }}>
                                                                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>Date</th>
                                                                    <th style={{ textAlign: 'right', padding: '4px 8px' }}>Amount</th>
                                                                    <th style={{ textAlign: 'right', padding: '4px 8px' }}>Change</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {sub.allTransactions.slice().reverse().slice(0, 10).map((txn, j, arr) => {
                                                                    const prevTxn = j < arr.length - 1 ? arr[j + 1] : null;
                                                                    const change = prevTxn ? txn.amount - prevTxn.amount : 0;
                                                                    return (
                                                                        <tr key={j} style={{ borderTop: '1px solid var(--border-color)' }}>
                                                                            <td style={{ padding: '6px 8px' }}>{txn.date.toLocaleDateString()}</td>
                                                                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500' }}>${txn.amount.toFixed(2)}</td>
                                                                            <td style={{
                                                                                padding: '6px 8px',
                                                                                textAlign: 'right',
                                                                                color: change > 0 ? 'var(--accent-danger)' : change < 0 ? 'var(--accent-success)' : 'var(--text-secondary)'
                                                                            }}>
                                                                                {change !== 0 ? `${change > 0 ? '+' : ''}$${change.toFixed(2)}` : '—'}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                        {sub.allTransactions.length > 10 && (
                                                            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                                                                Showing 10 of {sub.allTransactions.length} payments
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Denied section (collapsed by default) */}
                    {deniedItems.length > 0 && (
                        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                            <div
                                onClick={() => setDeniedCollapsed(!deniedCollapsed)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.8rem'
                                }}
                            >
                                {deniedCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                Previously Denied ({deniedItems.length})
                            </div>
                            {!deniedCollapsed && (
                                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {deniedItems.map(sub => (
                                        <div
                                            key={sub.merchantKey}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px 12px',
                                                background: 'rgba(255, 255, 255, 0.02)',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border-color)',
                                                opacity: 0.7
                                            }}
                                        >
                                            <span style={{ fontSize: '0.85rem' }}>{sub.merchant}</span>
                                            <button
                                                onClick={() => undenyItem(sub.merchantKey)}
                                                style={{
                                                    padding: '4px 8px',
                                                    background: 'rgba(99, 102, 241, 0.2)',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    color: 'var(--accent-primary)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.7rem'
                                                }}
                                            >
                                                Restore
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Pending items sidebar */}
            {pendingItems.length > 0 && (
                <div style={{ width: '320px', flexShrink: 0 }}>
                    <div className="card" style={{ position: 'sticky', top: '24px' }}>
                        <div className="card-title" style={{ marginBottom: '16px' }}>
                            Pending Review ({pendingItems.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {pendingItems.slice(0, 10).map(sub => (
                                <div
                                    key={sub.merchantKey}
                                    style={{
                                        padding: '12px',
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)'
                                    }}
                                >
                                    <div style={{ marginBottom: '8px' }}>
                                        <div style={{ fontWeight: '500', marginBottom: '2px' }}>{sub.merchant}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {sub.frequency} • ${sub.latestAmount.toFixed(2)}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                            {sub.category}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => approveItem(sub.merchantKey)}
                                            style={{
                                                flex: 1,
                                                padding: '6px',
                                                background: 'var(--accent-success)',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: 'white',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '4px',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            <Check size={14} /> Add
                                        </button>
                                        <button
                                            onClick={() => denyItem(sub.merchantKey)}
                                            style={{
                                                flex: 1,
                                                padding: '6px',
                                                background: 'rgba(239, 68, 68, 0.2)',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: 'var(--accent-danger)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '4px',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            <X size={14} /> Deny
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {pendingItems.length > 10 && (
                                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                    +{pendingItems.length - 10} more items
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Split Merchant Modal */}
            {splitModalOpen && merchantToSplit && (
                <SplitMerchantModal
                    isOpen={splitModalOpen}
                    onClose={() => {
                        setSplitModalOpen(false);
                        setMerchantToSplit(null);
                    }}
                    merchantKey={merchantToSplit.merchantKey}
                    merchantName={merchantToSplit.merchantName}
                    transactions={merchantToSplit.transactions}
                    existingSplits={merchantSplits[merchantToSplit.merchantKey]}
                    onSave={(splitData) => saveMerchantSplit(merchantToSplit.merchantKey, splitData)}
                />
            )}
        </div>
    );
}
