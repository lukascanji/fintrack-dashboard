import { useState, useMemo, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, CreditCard, Building2, Calendar, Users, Plus, Check, X, Edit2 } from 'lucide-react';
import { filterByDateRange } from './DateRangeFilter';
import { saveCategoryRule, getMerchantKey } from '../utils/categorize';

const NAMES_STORAGE_KEY = 'fintrack_person_names';
const PEOPLE_LIST_KEY = 'fintrack_people_list';
const RECENT_PEOPLE_KEY = 'fintrack_recent_people';
const GLOBAL_RENAMES_KEY = 'fintrack_global_renames';

const ALL_CATEGORIES = [
    'DINING', 'GROCERIES', 'SHOPPING', 'TRANSPORTATION', 'ENTERTAINMENT',
    'UTILITIES', 'TRANSFER', 'GAMBLING', 'FEES', 'INCOME', 'OTHER'
];

// Helper to get account type - now uses accountType from transaction if available
function getAccountType(transaction) {
    if (transaction.accountType) return transaction.accountType;
    // Fallback to source-based detection
    const source = transaction.source || '';
    if (source.toLowerCase().includes('chequing') || source.toLowerCase().includes('debit')) {
        return 'Chequing';
    }
    if (source.toLowerCase().includes('credit')) {
        return 'Credit Card';
    }
    return 'Unknown';
}

export default function TransactionTable({ transactions, showToast, onRecategorize }) {
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState('date');
    const [sortDir, setSortDir] = useState('desc');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [accountFilter, setAccountFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'spending', 'income'
    const [dateRange, setDateRange] = useState('all');
    const [displayCount, setDisplayCount] = useState(50);
    const [nameSelectorOpen, setNameSelectorOpen] = useState(null);
    const [newNameInput, setNewNameInput] = useState('');
    const [categoryEditOpen, setCategoryEditOpen] = useState(null);
    const [forceRefresh, setForceRefresh] = useState(0);
    const [exitingIds, setExitingIds] = useState(new Set());

    // Load person names from localStorage
    const [personNames, setPersonNames] = useState(() => {
        try {
            const saved = localStorage.getItem(NAMES_STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    // Save person names to localStorage
    useEffect(() => {
        localStorage.setItem(NAMES_STORAGE_KEY, JSON.stringify(personNames));
    }, [personNames]);

    // Get unique names
    const uniqueNames = useMemo(() => {
        const allNames = Object.values(personNames).filter(n => n && n.trim());
        return [...new Set(allNames)];
    }, [personNames]);

    // Unified people list (shared across all tabs)
    const [peopleList, setPeopleList] = useState(() => {
        try {
            const saved = localStorage.getItem(PEOPLE_LIST_KEY);
            return saved ? JSON.parse(saved) : ['You'];
        } catch {
            return ['You'];
        }
    });

    // Save people list to localStorage
    useEffect(() => {
        localStorage.setItem(PEOPLE_LIST_KEY, JSON.stringify(peopleList));
    }, [peopleList]);

    // Load global renames from localStorage
    const [globalRenames, setGlobalRenames] = useState(() => {
        try {
            const saved = localStorage.getItem(GLOBAL_RENAMES_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    // Listen for localStorage changes (from Recurring tab)
    useEffect(() => {
        const handleStorageChange = () => {
            try {
                const saved = localStorage.getItem(GLOBAL_RENAMES_KEY);
                setGlobalRenames(saved ? JSON.parse(saved) : {});
            } catch {
                // ignore
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Get display name for merchant (apply global renames)
    const getDisplayMerchant = (txn) => {
        // Try to find a matching rename by checking all possible keys
        const merchantKey = getMerchantKey(txn.merchant);

        // Check for exact merchantKey match with amount
        const amountKey = `${merchantKey}-${Math.abs(txn.amount).toFixed(2)}`;
        if (globalRenames[amountKey]?.displayName) {
            return globalRenames[amountKey].displayName;
        }

        // Check for merchantKey match without amount
        if (globalRenames[merchantKey]?.displayName) {
            return globalRenames[merchantKey].displayName;
        }

        // Fall back to original merchant
        return txn.merchant;
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

    const DATE_PRESETS = [
        { label: 'All Time', value: 'all' },
        { label: 'This Month', value: 'thisMonth' },
        { label: 'Last Month', value: 'lastMonth' },
        { label: 'Last 3 Months', value: 'last3Months' },
        { label: 'Last 6 Months', value: 'last6Months' },
        { label: 'This Year', value: 'thisYear' }
    ];

    const categories = useMemo(() => {
        if (!transactions) return [];
        return [...new Set(transactions.map(t => t.category))].sort();
    }, [transactions]);

    const accounts = useMemo(() => {
        if (!transactions) return [];
        return [...new Set(transactions.map(t => getAccountType(t)))].sort();
    }, [transactions]);

    const allFilteredTransactions = useMemo(() => {
        if (!transactions) return [];

        // First apply date filter
        let filtered = filterByDateRange(transactions, dateRange);

        // Apply type filter (spending/income/all)
        if (typeFilter === 'spending') {
            filtered = filtered.filter(t => t.debit > 0);
        } else if (typeFilter === 'income') {
            filtered = filtered.filter(t => t.credit > 0);
        }

        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(t =>
                t.description.toLowerCase().includes(searchLower) ||
                t.merchant.toLowerCase().includes(searchLower)
            );
        }

        if (categoryFilter !== 'all') {
            // Keep exiting items visible during animation even if their category changed
            filtered = filtered.filter(t => t.category === categoryFilter || exitingIds.has(t.id));
        }

        if (accountFilter !== 'all') {
            filtered = filtered.filter(t => getAccountType(t) === accountFilter);
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
    }, [transactions, search, sortField, sortDir, categoryFilter, accountFilter, typeFilter, dateRange, exitingIds]);

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
    }, [categoryFilter, accountFilter, typeFilter, search, dateRange]);

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
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '0.875rem'
                        }}
                    >
                        {DATE_PRESETS.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                    </select>
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
                        </tr>
                    </thead>
                    <tbody key={`${categoryFilter}-${accountFilter}-${search}`}>
                        {displayedTransactions.map((t) => (
                            <tr key={t.id} className={exitingIds.has(t.id) ? 'exiting' : ''}>
                                <td>{t.date.toLocaleDateString()}</td>
                                <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {t.description}
                                </td>
                                <td>{getDisplayMerchant(t)}</td>
                                <td style={{ position: 'relative' }}>
                                    <span
                                        className={`category-badge ${t.category === 'GAMBLING' ? 'gambling' : ''} ${t.category === 'FEES' ? 'fees' : ''}`}
                                        onClick={() => setCategoryEditOpen(categoryEditOpen === t.id ? null : t.id)}
                                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        {t.category}
                                        <Edit2 size={10} style={{ opacity: 0.5 }} />
                                    </span>

                                    {/* Category edit dropdown */}
                                    {categoryEditOpen === t.id && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                zIndex: 100,
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '8px',
                                                padding: '8px',
                                                minWidth: '150px',
                                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                                            }}
                                        >
                                            <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                                Change Category
                                            </div>
                                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                {ALL_CATEGORIES.map((cat) => (
                                                    <div
                                                        key={cat}
                                                        onClick={() => {
                                                            // Save rule using description as pattern
                                                            saveCategoryRule(t.description, t.merchant, cat);
                                                            setCategoryEditOpen(null);

                                                            // Count how many transactions will be affected
                                                            const pattern = t.description.toUpperCase();
                                                            const affectedIds = transactions
                                                                .filter(txn => txn.description.toUpperCase().includes(pattern))
                                                                .map(txn => txn.id);

                                                            // If filtering by category, animate items that will disappear
                                                            if (categoryFilter !== 'all' && categoryFilter !== cat) {
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
                                                                showToast(`${affectedIds.length} transaction${affectedIds.length !== 1 ? 's' : ''} → ${cat}`, 'success');
                                                            }
                                                        }}
                                                        style={{
                                                            padding: '6px 10px',
                                                            background: cat === t.category ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                                            borderRadius: '4px',
                                                            marginBottom: '2px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.75rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between'
                                                        }}
                                                    >
                                                        {cat}
                                                        {cat === t.category && <Check size={12} color="var(--accent-success)" />}
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-color)' }}>
                                                Rule will apply to future imports
                                            </div>
                                        </div>
                                    )}
                                </td>
                                <td style={{
                                    textAlign: 'right',
                                    fontWeight: '600',
                                    color: t.credit > 0 ? 'var(--accent-success)' : 'inherit'
                                }}>
                                    {t.debit > 0 ? `-$${t.debit.toLocaleString()}` : `+$${t.credit.toLocaleString()}`}
                                </td>
                                <td>
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.75rem',
                                        color: getAccountType(t) === 'Credit Card' ? 'var(--accent-warning)' : 'var(--accent-success)'
                                    }}>
                                        {getAccountType(t) === 'Credit Card' ? <CreditCard size={12} /> : <Building2 size={12} />}
                                        {getAccountType(t)}
                                    </span>
                                </td>
                                <td style={{ position: 'relative' }}>
                                    {personNames[t.id] ? (
                                        <span
                                            onClick={() => setNameSelectorOpen(nameSelectorOpen === t.id ? null : t.id)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '2px 8px',
                                                background: 'rgba(99, 102, 241, 0.2)',
                                                borderRadius: '12px',
                                                fontSize: '0.7rem',
                                                color: 'var(--accent-primary)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Users size={10} />
                                            {personNames[t.id]}
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => setNameSelectorOpen(nameSelectorOpen === t.id ? null : t.id)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '22px',
                                                height: '22px',
                                                padding: 0,
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px dashed var(--border-color)',
                                                borderRadius: '50%',
                                                cursor: 'pointer',
                                                color: 'var(--text-secondary)'
                                            }}
                                            title="Assign to person"
                                        >
                                            <Plus size={12} />
                                        </button>
                                    )}

                                    {/* Name selector dropdown */}
                                    {nameSelectorOpen === t.id && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                position: 'absolute',
                                                top: '100%',
                                                right: 0,
                                                zIndex: 100,
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '8px',
                                                padding: '8px',
                                                minWidth: '180px',
                                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                                            }}
                                        >
                                            <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                                Assign to Person
                                            </div>

                                            {sortedPeople.length > 0 && (
                                                <div style={{ marginBottom: '6px' }}>
                                                    {sortedPeople.map((name, j) => (
                                                        <div
                                                            key={j}
                                                            onClick={() => assignName(t.id, name)}
                                                            style={{
                                                                padding: '4px 8px',
                                                                background: personNames[t.id] === name ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                                                borderRadius: '4px',
                                                                marginBottom: '2px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.75rem',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px'
                                                            }}
                                                        >
                                                            <Users size={10} color="var(--accent-primary)" />
                                                            {name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <input
                                                    type="text"
                                                    value={newNameInput}
                                                    onChange={(e) => setNewNameInput(e.target.value)}
                                                    placeholder="New name..."
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && newNameInput.trim()) {
                                                            assignName(t.id, newNameInput.trim());
                                                        }
                                                        if (e.key === 'Escape') setNameSelectorOpen(null);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '4px 8px',
                                                        background: 'rgba(255, 255, 255, 0.1)',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '4px',
                                                        color: 'white',
                                                        fontSize: '0.75rem'
                                                    }}
                                                />
                                                <button
                                                    onClick={() => newNameInput.trim() && assignName(t.id, newNameInput.trim())}
                                                    disabled={!newNameInput.trim()}
                                                    style={{
                                                        padding: '4px 8px',
                                                        background: newNameInput.trim() ? 'var(--accent-success)' : 'rgba(255, 255, 255, 0.1)',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: newNameInput.trim() ? 'pointer' : 'default',
                                                        color: 'white'
                                                    }}
                                                >
                                                    <Check size={12} />
                                                </button>
                                            </div>

                                            {personNames[t.id] && (
                                                <button
                                                    onClick={() => removeName(t.id)}
                                                    style={{
                                                        marginTop: '6px',
                                                        padding: '2px 6px',
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--accent-danger)',
                                                        fontSize: '0.65rem',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <X size={10} /> Remove
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
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
                border: `1px solid ${typeFilter === 'income' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
            }}>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        {typeFilter === 'income' ? 'Total Income' : typeFilter === 'spending' ? (categoryFilter !== 'all' ? `${categoryFilter} Total` : 'Total Spent') : 'Net Total'}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: typeFilter === 'income' ? 'var(--accent-success)' : 'var(--accent-primary)' }}>
                        {typeFilter === 'income'
                            ? `+$${totals.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : typeFilter === 'spending'
                                ? `-$${totals.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : `$${(totals.totalCredit - totals.totalDebit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
        </div>
    );
}
