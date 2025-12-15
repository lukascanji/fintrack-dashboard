
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, ChevronDown, ChevronUp, Plus, Calendar } from 'lucide-react';
import { filterByDateRange, PRESETS as DATE_PRESETS } from './DateRangeFilter';
import DateRangeFilter from './DateRangeFilter';
import { saveCategoryRule, getMerchantKey } from '../utils/categorize';
import { useTransactions } from '../context/TransactionContext';
import { getTransactionId } from '../utils/transactionId';
import TransactionRow from '../features/transactions/components/TransactionRow';
import { ALL_CATEGORIES } from '../utils/constants';
import DuplicateRecurringModal from './DuplicateRecurringModal';

const NAMES_STORAGE_KEY = 'fintrack_person_names';
const PEOPLE_LIST_KEY = 'fintrack_people_list';
const RECENT_PEOPLE_KEY = 'fintrack_recent_people';
const GLOBAL_RENAMES_KEY = 'fintrack_global_renames';
const MANUAL_RECURRING_KEY = 'fintrack_manual_recurring';
const APPROVED_KEY = 'fintrack_recurring_approved';

export default function TransactionTable({ showToast, presetFilters }) {
    // Initialize filters from presetFilters prop if provided
    const [search, setSearch] = useState(presetFilters?.search || '');
    const [sortField, setSortField] = useState('date');
    const [sortDir, setSortDir] = useState('desc');
    const [categoryFilter, setCategoryFilter] = useState(presetFilters?.category || 'all');
    const [accountFilter, setAccountFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState(presetFilters?.type || 'all'); // 'all', 'spending', 'income'
    const [recurringFilter, setRecurringFilter] = useState('all'); // 'all', 'recurring', 'one-time'
    const [dateRange, setDateRange] = useState(presetFilters?.period || 'all');
    const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });
    const [excludeCategories, setExcludeCategories] = useState(presetFilters?.excludeCategories || []);
    const [displayCount, setDisplayCount] = useState(50);
    const [forceRefresh, setForceRefresh] = useState(0);
    const [exitingIds, setExitingIds] = useState(new Set());

    // Update filters when presetFilters change (e.g., navigation from Sankey or Dashboard charts)
    useEffect(() => {
        if (presetFilters) {
            if (presetFilters.search !== undefined) setSearch(presetFilters.search);
            if (presetFilters.category !== undefined) setCategoryFilter(presetFilters.category);
            if (presetFilters.period !== undefined) setDateRange(presetFilters.period);
            if (presetFilters.customDates !== undefined) setCustomDateRange(presetFilters.customDates);
            if (presetFilters.type !== undefined) setTypeFilter(presetFilters.type);
            if (presetFilters.excludeCategories !== undefined) setExcludeCategories(presetFilters.excludeCategories);
        }
    }, [presetFilters]);

    // --- Global State from Context ---
    const {
        personNames, setPersonNames,
        peopleList, setPeopleList,
        globalRenames,
        approvedItems, setApprovedItems,
        transactions, recategorizeAll,
        chargeAssignments, setChargeAssignments,
        manualRecurring, setManualRecurring,
        mergedSubscriptions,
        categoryOverrides, setCategoryOverrides,
        subscriptionRules, setSubscriptionRules
    } = useTransactions();

    // --- Add to Recurring State ---
    const [isAddingRecurring, setIsAddingRecurring] = useState(null); // txnId of item being added
    const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
    const [duplicateInfo, setDuplicateInfo] = useState({ existing: null, newTxn: null });

    // Aliases for compatibility
    const onRecategorize = recategorizeAll;

    // Aliases for compatibility
    const approvedRecurring = approvedItems;
    const setApprovedRecurring = setApprovedItems;
    // ---------------------------------

    const getAccountType = (txn) => {
        if (txn.accountType) return txn.accountType;
        return (txn.amount || txn.debit || 0) > 0 ? 'Checking' : 'Credit Card';
    };

    // Check if a transaction is part of an approved recurring item
    const isRecurring = (txn) => {
        const txnId = getTransactionId(txn);

        // Check specific assignment (splits/manual) - use getTransactionId for consistent key
        if (chargeAssignments[txnId]) return true;

        // Check base merchant key against approved list
        const merchantKey = getMerchantKey(txn.description);
        if (approvedRecurring.includes(merchantKey)) return true;

        // Check amount-suffixed key (for umbrella merchants with same amount)
        const amount = Math.abs(txn.debit || txn.credit || txn.amount || 0).toFixed(2);
        const amountKey = `${merchantKey}-${amount}`;
        if (approvedRecurring.includes(amountKey)) return true;

        // Check if merchant key exists in manualRecurring (split children)
        if (manualRecurring.some(m => m.merchantKey === merchantKey || m.merchantKey === amountKey)) return true;

        return false;
    };

    // Load recent people usage for ordering
    const [recentPeople, setRecentPeople] = useState(() => {
        try {
            const saved = localStorage.getItem(RECENT_PEOPLE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Save recent people
    useEffect(() => {
        localStorage.setItem(RECENT_PEOPLE_KEY, JSON.stringify(recentPeople));
    }, [recentPeople]);

    // Sort people list: recent first, then rest of list
    const sortedPeople = useMemo(() => {
        const seen = new Set();
        const result = [];

        // Recent first (from the list only)
        recentPeople.forEach(name => {
            if (peopleList.includes(name) && !seen.has(name)) {
                result.push(name);
                seen.add(name);
            }
        });

        // Rest of people list
        peopleList.forEach(name => {
            if (!seen.has(name)) {
                result.push(name);
                seen.add(name);
            }
        });

        return result;
    }, [recentPeople, peopleList]);

    const assignName = (txnId, name) => {
        setPersonNames(prev => ({ ...prev, [txnId]: name }));
        // Track as recently used (keep last 10)
        setRecentPeople(prev => {
            const filtered = prev.filter(p => p !== name);
            return [name, ...filtered].slice(0, 10);
        });
        // If this is a new person, add to the unified people list
        if (!peopleList.includes(name)) {
            setPeopleList(prev => [...prev, name]);
        }
        setNameSelectorOpen(null);
        setNewNameInput('');
    };

    const removeName = (txnId) => {
        setPersonNames(prev => {
            const updated = { ...prev };
            delete updated[txnId];
            return updated;
        });
        setNameSelectorOpen(null);
    };

    // Check if a transaction already exists in recurring
    const findExistingRecurring = useCallback((txn) => {
        // Use description for consistent key derivation (matches isRecurring() check)
        const merchantKey = getMerchantKey(txn.description);
        return manualRecurring.find(item => item.merchantKey === merchantKey);
    }, [manualRecurring]);

    // Core function to add transaction to recurring (called after duplicate check)
    const executeAddToRecurring = useCallback((txn, forceAdd = false) => {
        const txnId = getTransactionId(txn);
        setIsAddingRecurring(txnId);

        try {
            // 1. Derive key from description (consistent with isRecurring)
            const merchantKey = getMerchantKey(txn.description);

            // 2. Check if already exists (unless forcing add)
            const existingItem = findExistingRecurring(txn);
            if (existingItem && !forceAdd) {
                // Show duplicate modal
                setDuplicateInfo({ existing: existingItem, newTxn: txn });
                setDuplicateModalOpen(true);
                setIsAddingRecurring(null);
                return;
            }

            // 3. Create new entry
            const newEntry = {
                merchantKey,
                merchant: txn.merchant,
                description: txn.description,
                amount: txn.debit || txn.credit || txn.amount || 0,
                category: txn.category,
                dateAdded: new Date().toISOString(),
                sourceTransactionId: txnId
            };

            // 4. Update React state AND localStorage
            setManualRecurring(prev => {
                // Avoid duplicates if forcing
                if (forceAdd) {
                    const filtered = prev.filter(item => item.merchantKey !== merchantKey);
                    return [...filtered, newEntry];
                }
                return [...prev, newEntry];
            });

            // 5. Auto-approve
            setApprovedItems(prev => {
                if (!prev.includes(merchantKey)) {
                    return [...prev, merchantKey];
                }
                return prev;
            });

            // 6. Create charge assignment linking transaction to recurring item
            setChargeAssignments(prev => ({
                ...prev,
                [txnId]: merchantKey
            }));

            // 7. Register subscription rule for future auto-matching
            setSubscriptionRules(prev => ({
                ...prev,
                [merchantKey]: {
                    merchantKey,
                    patterns: [txn.description.toUpperCase()],
                    createdAt: new Date().toISOString()
                }
            }));

            // 8. User feedback
            if (showToast) {
                const message = forceAdd
                    ? `Added duplicate "${txn.merchant}" to recurring`
                    : `Added "${txn.merchant}" to recurring`;
                showToast(message, 'success');
            }
        } catch (e) {
            console.error('Failed to add to recurring:', e);
            if (showToast) showToast('Failed to add to recurring', 'error');
        } finally {
            setIsAddingRecurring(null);
        }
    }, [findExistingRecurring, setManualRecurring, setApprovedItems, setChargeAssignments, setSubscriptionRules, showToast]);

    // Public handler for add to recurring button
    const addToRecurring = useCallback((txn) => {
        executeAddToRecurring(txn, false);
    }, [executeAddToRecurring]);

    // Duplicate modal handlers
    const handleDuplicateCancel = useCallback(() => {
        setDuplicateModalOpen(false);
        setDuplicateInfo({ existing: null, newTxn: null });
        if (showToast) showToast('Cancelled - item already exists', 'info');
    }, [showToast]);

    const handleDuplicateAddAnyway = useCallback(() => {
        if (duplicateInfo.newTxn) {
            executeAddToRecurring(duplicateInfo.newTxn, true);
        }
        setDuplicateModalOpen(false);
        setDuplicateInfo({ existing: null, newTxn: null });
    }, [duplicateInfo.newTxn, executeAddToRecurring]);

    // Add ALL matching transactions to recurring (groups by merchantKey)
    const addAllMatchingToRecurring = (txn) => {
        try {
            const merchantKey = getMerchantKey(txn.description);
            const amount = txn.debit || txn.credit || txn.amount || 0;

            // Find all transactions with same merchantKey and similar amount
            const matchingTxns = transactions.filter(t => {
                const tKey = getMerchantKey(t.description);
                const tAmount = t.debit || t.credit || t.amount || 0;
                // Match by merchantKey and fuzzy amount (within 3%)
                return tKey === merchantKey &&
                    (tAmount === 0 || amount === 0 ? tAmount === amount :
                        Math.abs(tAmount - amount) / Math.max(tAmount, amount) < 0.03);
            });

            const existing = JSON.parse(localStorage.getItem(MANUAL_RECURRING_KEY) || '[]');

            // Check if already added
            if (existing.some(item => item.merchantKey === merchantKey)) {
                return; // Already in recurring
            }

            const newEntry = {
                merchantKey: merchantKey,
                merchant: txn.merchant,
                description: txn.description,
                amount: amount,
                category: txn.category,
                dateAdded: new Date().toISOString(),
                sourceTransactionId: txn.id,
                // Store matching info for Recurring tab display
                matchCount: matchingTxns.length,
                matchDates: matchingTxns.map(t => t.date).sort((a, b) => new Date(a) - new Date(b)),
                isAllMatching: true
            };

            existing.push(newEntry);
            localStorage.setItem(MANUAL_RECURRING_KEY, JSON.stringify(existing));

            // Also auto-approve it
            const approved = JSON.parse(localStorage.getItem('fintrack_recurring_approved') || '[]');
            if (!approved.includes(merchantKey)) {
                approved.push(merchantKey);
                localStorage.setItem('fintrack_recurring_approved', JSON.stringify(approved));
            }

            // Refresh approvedRecurring state immediately
            setApprovedRecurring(approved);
        } catch (e) {
            console.error('Failed to add all matching to recurring:', e);
        }
    };

    // Helper to handle category changes from a row
    const handleCategoryChange = (t, newCategory) => {
        const txnId = getTransactionId(t);
        const merchantKey = getMerchantKey(t.description);
        const amount = Math.abs(t.debit || t.credit || t.amount || 0).toFixed(2);

        // Always save a pattern rule using the description so categorizeMerchant() matches
        // This ensures the Transactions tab updates its displayed category
        saveCategoryRule(t.description, t.merchant, newCategory);

        // Determine the key for categoryOverrides (for Recurring tab sync)
        // Priority: chargeAssignment > amount-suffixed key > base merchantKey
        let primaryKey;
        if (chargeAssignments[txnId]) {
            // This transaction is assigned to a specific subscription (e.g., imported Britbox)
            primaryKey = chargeAssignments[txnId];
        } else {
            // For manual transactions, use amount-suffixed key for precision
            primaryKey = `${merchantKey}-${amount}`;
        }

        // Update categoryOverrides for the specific key (syncs to Recurring tab)
        const keysToUpdate = new Set([primaryKey]);

        // Also update the base merchantKey if no specific assignment
        if (!chargeAssignments[txnId]) {
            keysToUpdate.add(merchantKey);
        }

        setCategoryOverrides(prev => {
            const updates = {};
            keysToUpdate.forEach(key => {
                updates[key] = newCategory;
            });
            return { ...prev, ...updates };
        });

        // Count only transactions that belong to THIS specific subscription
        const affectedIds = transactions
            .filter(txn => {
                const id = getTransactionId(txn);
                // Primary match: same charge assignment
                if (chargeAssignments[txnId] && chargeAssignments[id] === chargeAssignments[txnId]) {
                    return true;
                }
                // If no chargeAssignment, match by merchantKey + amount
                if (!chargeAssignments[txnId]) {
                    const key = getMerchantKey(txn.description);
                    const amt = Math.abs(txn.debit || txn.credit || txn.amount || 0).toFixed(2);
                    if (key === merchantKey && amt === amount) return true;
                }
                return false;
            })
            .map(txn => txn.id);

        // If filtering by category, animate items that will disappear
        if (categoryFilter !== 'all' && categoryFilter !== newCategory) {
            setExitingIds(new Set(affectedIds));

            // After animation, do the recategorize
            setTimeout(() => {
                setExitingIds(new Set());
                if (onRecategorize) onRecategorize();
            }, 400);
        } else {
            // Immediate recategorize if not filtering
            if (onRecategorize) onRecategorize();
        }

        // Show toast notification
        if (showToast) {
            showToast(`${affectedIds.length} transaction${affectedIds.length !== 1 ? 's' : ''} → ${newCategory} `, 'success');
        }
    };



    const DATE_PRESETS = [
        { label: 'All Time', value: 'all' },
        { label: 'This Month', value: 'thisMonth' },
        { label: 'Last Month', value: 'lastMonth' },
        { label: 'Last 3 Months', value: 'last3Months' },
        { label: 'Last 6 Months', value: 'last6Months' },
        { label: 'This Year', value: 'thisYear' }
    ];

    // --- Derived State ---
    const effectiveNames = useMemo(() => {
        const names = {};

        // 1. Add manual recurring names (like splits)
        manualRecurring.forEach(sub => {
            if (sub.merchantKey && sub.displayName) {
                names[sub.merchantKey] = sub.displayName;
            }
        });

        // 2. Add merged subscription names
        Object.entries(mergedSubscriptions || {}).forEach(([key, merge]) => {
            if (merge.displayName) {
                names[key] = merge.displayName;
            }
        });

        // 3. Override with global renames if they exist
        Object.entries(globalRenames).forEach(([key, value]) => {
            if (value && value.displayName) {
                names[key] = value.displayName;
            }
        });

        return names;
    }, [manualRecurring, mergedSubscriptions, globalRenames]);

    const categories = useMemo(() => {
        if (!transactions) return [];
        return [...new Set(transactions.map(t => t.category))].sort();
    }, [transactions]);
    // ...


    const accounts = useMemo(() => {
        if (!transactions) return [];
        return [...new Set(transactions.map(t => getAccountType(t)))].sort();
    }, [transactions]);

    const allFilteredTransactions = useMemo(() => {
        if (!transactions) return [];

        // First apply date filter
        let filtered = filterByDateRange(transactions, dateRange, customDateRange);

        // Apply type filter (spending/income/all)
        if (typeFilter === 'spending') {
            filtered = filtered.filter(t => t.debit > 0);
        } else if (typeFilter === 'income') {
            filtered = filtered.filter(t => t.credit > 0);
        }

        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(t => {
                // Check original description and merchant
                if (t.description.toLowerCase().includes(searchLower)) return true;
                if (t.merchant.toLowerCase().includes(searchLower)) return true;

                // Also check effective name (from renames, splits, merges)
                const txnId = getTransactionId(t);
                let effectiveName = null;

                // Priority 1: Charge assignment redirect
                if (chargeAssignments[txnId]) {
                    effectiveName = effectiveNames[chargeAssignments[txnId]];
                }

                // Priority 2: Try merchantKey with amount suffix
                if (!effectiveName) {
                    const baseKey = getMerchantKey(t.description);
                    const amount = Math.abs(t.debit || t.credit || t.amount || 0).toFixed(2);
                    const amountKey = `${baseKey}-${amount}`;
                    effectiveName = effectiveNames[amountKey] || effectiveNames[baseKey];
                }

                if (effectiveName && effectiveName.toLowerCase().includes(searchLower)) return true;

                return false;
            });
        }

        if (categoryFilter !== 'all') {
            // Keep exiting items visible during animation even if their category changed
            filtered = filtered.filter(t => t.category === categoryFilter || exitingIds.has(t.id));
        }

        // Apply category exclusion filter (from Sankey navigation for "Other Income")
        if (excludeCategories && excludeCategories.length > 0) {
            filtered = filtered.filter(t => !excludeCategories.includes(t.category));
        }

        if (accountFilter !== 'all') {
            filtered = filtered.filter(t => getAccountType(t) === accountFilter);
        }

        // Apply recurring filter
        if (recurringFilter === 'recurring') {
            filtered = filtered.filter(t => isRecurring(t));
        } else if (recurringFilter === 'one-time') {
            filtered = filtered.filter(t => !isRecurring(t));
        }

        filtered.sort((a, b) => {
            let aVal, bVal;
            if (sortField === 'date') {
                aVal = a.date.getTime();
                bVal = b.date.getTime();
            } else if (sortField === 'amount') {
                // For sorting, use the absolute amount (debit or credit)
                aVal = a.debit > 0 ? a.debit : a.credit;
                bVal = b.debit > 0 ? b.debit : b.credit;
            } else {
                aVal = a.merchant;
                bVal = b.merchant;
            }
            return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
        });

        // Debug: log what categories are in the filtered results
        console.log('Filter:', categoryFilter, 'Results:', filtered.length,
            'Categories in results:', [...new Set(filtered.map(t => t.category))]);

        return filtered;
    }, [transactions, search, sortField, sortDir, categoryFilter, accountFilter, typeFilter, recurringFilter, dateRange, customDateRange, exitingIds, effectiveNames, chargeAssignments, approvedRecurring, manualRecurring, excludeCategories]);

    // Calculate totals for filtered transactions
    const totals = useMemo(() => {
        const totalDebit = allFilteredTransactions.reduce((sum, t) => sum + t.debit, 0);
        const totalCredit = allFilteredTransactions.reduce((sum, t) => sum + t.credit, 0);
        const count = allFilteredTransactions.length;
        return { totalDebit, totalCredit, count };
    }, [allFilteredTransactions]);

    // Reset display count when filters change
    useEffect(() => {
        setDisplayCount(50);
    }, [categoryFilter, accountFilter, typeFilter, recurringFilter, search, dateRange]);

    const displayedTransactions = allFilteredTransactions.slice(0, displayCount);
    const hasMore = displayCount < allFilteredTransactions.length;

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return null;
        return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
    };

    if (!transactions || transactions.length === 0) return null;

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div className="card-title" style={{ margin: 0 }}>Transactions</div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {/* Date Range Filter */}
                    <DateRangeFilter
                        value={dateRange}
                        onChange={setDateRange}
                        customDates={customDateRange}
                        onCustomDatesChange={setCustomDateRange}
                    />
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                padding: '8px 12px 8px 36px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '0.875rem',
                                width: '180px'
                            }}
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '0.875rem'
                        }}
                    >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <select
                        value={accountFilter}
                        onChange={(e) => setAccountFilter(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '0.875rem'
                        }}
                    >
                        <option value="all">All Accounts</option>
                        {accounts.map(acc => (
                            <option key={acc} value={acc}>{acc}</option>
                        ))}
                    </select>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            background: typeFilter === 'income' ? 'rgba(16, 185, 129, 0.2)' : typeFilter === 'spending' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '0.875rem'
                        }}
                    >
                        <option value="all">All Types</option>
                        <option value="spending">Spending</option>
                        <option value="income">Income</option>
                    </select>
                    <select
                        value={recurringFilter}
                        onChange={(e) => setRecurringFilter(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            background: recurringFilter === 'recurring' ? 'rgba(16, 185, 129, 0.2)' : recurringFilter === 'one-time' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '0.875rem'
                        }}
                    >
                        <option value="all">All Items</option>
                        <option value="recurring">Recurring Only</option>
                        <option value="one-time">One-Time Only</option>
                    </select>
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table className="transaction-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                                Date <SortIcon field="date" />
                            </th>
                            <th>Description</th>
                            <th onClick={() => handleSort('merchant')} style={{ cursor: 'pointer' }}>
                                Merchant <SortIcon field="merchant" />
                            </th>
                            <th>Category</th>
                            <th onClick={() => handleSort('amount')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                                Amount <SortIcon field="amount" />
                            </th>
                            <th>Account</th>
                            <th style={{ width: '100px' }}>Person</th>
                            <th style={{ width: '40px' }}></th>
                        </tr>
                    </thead>
                    <tbody key={`${categoryFilter} -${accountFilter} -${search} `}>
                        {displayedTransactions.map((t) => (
                            <TransactionRow
                                key={t.id}
                                transaction={t}
                                isExiting={exitingIds.has(t.id)}
                                globalRenames={globalRenames}
                                personName={personNames[t.id]}
                                people={sortedPeople}
                                onAssignPerson={(name) => assignName(t.id, name)}
                                onRemovePerson={() => removeName(t.id)}
                                onCategoryChange={(cat) => handleCategoryChange(t, cat)}
                                onAddToRecurring={() => addToRecurring(t)}
                                isRecurring={isRecurring(t)}
                                isAddingToRecurring={isAddingRecurring === t.id}
                                chargeAssignment={chargeAssignments[getTransactionId(t)]}
                                effectiveName={(() => {
                                    const txnId = getTransactionId(t);
                                    // Priority 1: Charge assignment redirect
                                    if (chargeAssignments[txnId]) {
                                        return effectiveNames[chargeAssignments[txnId]];
                                    }
                                    // Priority 2: Try merchantKey with amount suffix (e.g., "paypal-25.98")
                                    const baseKey = getMerchantKey(t.description);
                                    const amount = Math.abs(t.debit || t.credit || t.amount || 0).toFixed(2);
                                    const amountKey = `${baseKey}-${amount}`;
                                    if (effectiveNames[amountKey]) {
                                        return effectiveNames[amountKey];
                                    }
                                    // Priority 3: Try base merchantKey
                                    return effectiveNames[baseKey];
                                })()}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals Summary */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '16px',
                padding: '16px',
                background: typeFilter === 'income' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                borderRadius: '8px',
                border: `1px solid ${typeFilter === 'income' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'} `
            }}>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        {typeFilter === 'income' ? 'Total Income' : typeFilter === 'spending' ? (categoryFilter !== 'all' ? `${categoryFilter} Total` : 'Total Spent') : 'Net Total'}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: typeFilter === 'income' ? 'var(--accent-success)' : 'var(--accent-primary)' }}>
                        {typeFilter === 'income'
                            ? `+ $${totals.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} `
                            : typeFilter === 'spending'
                                ? `- $${totals.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} `
                                : `$${(totals.totalCredit - totals.totalDebit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} `
                        }
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Transactions
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                        {totals.count}
                    </div>
                </div>
            </div>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Showing {displayedTransactions.length} of {allFilteredTransactions.length} transactions
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {hasMore && (
                        <>
                            <button
                                onClick={() => setDisplayCount(prev => prev + 50)}
                                className="btn"
                                style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white', padding: '8px 16px' }}
                            >
                                Load More
                            </button>
                            <button
                                onClick={() => setDisplayCount(allFilteredTransactions.length)}
                                className="btn btn-primary"
                                style={{ padding: '8px 16px' }}
                            >
                                Show All ({allFilteredTransactions.length})
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Duplicate Recurring Modal */}
            <DuplicateRecurringModal
                isOpen={duplicateModalOpen}
                onClose={() => setDuplicateModalOpen(false)}
                existingItem={duplicateInfo.existing}
                newTransaction={duplicateInfo.newTxn}
                onCancel={handleDuplicateCancel}
                onAddAnyway={handleDuplicateAddAnyway}
            />
        </div>
    );
}
